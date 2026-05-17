import "server-only";
import { prisma } from "@/lib/db";
import { aiMarketerWeeklyTick } from "@/server/outreach/ai-marketer";
import { enrichProspect } from "@/server/outreach/enrich";
import { generateCardForProspect } from "@/server/outreach/generate-card";
import { validateEmail } from "@/server/outreach/validate-email";
import { inngest } from "./client";

/**
 * Worker 1 — Enrichissement d'un prospect.
 *
 * Concurrency=10 : limite la pression sur les sites externes scrapés.
 * Retries=3 : un site peut timeout (Cloudflare, slow VPS, etc.), on réessaie.
 */
export const onProspectEnrich = inngest.createFunction(
  {
    id: "outreach-enrich-prospect",
    concurrency: { limit: 10 },
    retries: 3,
    triggers: [{ event: "prospect/enrich.requested" }],
  },
  async ({ event, step }) => {
    const prospectId = BigInt(event.data.prospectId);

    // Étape 0 — Validation email (syntaxe + role-based + MX DNS).
    // Si invalide → on saute l'enrichissement (économise temps + Anthropic).
    const emailCheck = await step.run("validate-email", async () => {
      const p = await prisma.prospectRestaurant.findUnique({
        where: { id: prospectId },
        select: { email: true, status: true },
      });
      if (!p) return { ok: false as const, reason: "not_found" };

      const result = await validateEmail(p.email);
      if (!result.ok) {
        await prisma.prospectRestaurant.update({
          where: { id: prospectId },
          data: {
            status: "failed",
            errorMessage: `email_invalid:${result.reason}`,
          },
        });
        return { ok: false as const, reason: result.reason };
      }
      return { ok: true as const, tier: result.tier };
    });

    if (!emailCheck.ok) {
      return {
        prospectId: event.data.prospectId,
        step: "failed",
        reason: emailCheck.reason,
      };
    }

    await step.run("enrich", () => enrichProspect(prospectId));

    // Trigger l'étape suivante : génération de carte
    await step.sendEvent("trigger-generate", {
      name: "prospect/generate.requested",
      data: { prospectId: event.data.prospectId },
    });

    return {
      prospectId: event.data.prospectId,
      step: "enriched",
      emailTier: emailCheck.tier,
    };
  },
);

/**
 * Worker 2 — Génération de la carte digitale (Anthropic Vision/Haiku).
 *
 * Concurrency=5 : rate limit Anthropic tier 2 = 50 req/min, on reste large.
 * Retries=2 : un timeout API est rare, et on a déjà des fallbacks internes.
 */
export const onProspectGenerate = inngest.createFunction(
  {
    id: "outreach-generate-card",
    concurrency: { limit: 5 },
    retries: 2,
    triggers: [{ event: "prospect/generate.requested" }],
  },
  async ({ event, step }) => {
    const prospectId = BigInt(event.data.prospectId);

    const result = await step.run("generate", () =>
      generateCardForProspect(prospectId),
    );

    if (!result.ok) {
      return { prospectId: event.data.prospectId, step: "failed", error: result.error };
    }

    // À ce stade, le prospect a un cardToken et est en statut "generated".
    // L'envoi est piloté par Smartlead (cron côté admin → marque "sent"),
    // pas par Inngest, donc on s'arrête ici.
    return {
      prospectId: event.data.prospectId,
      step: "generated",
      source: result.source,
    };
  },
);

/**
 * Cron — Toutes les heures, scanne les prospects queued et trigger l'enrichissement.
 *
 * Permet de relancer le pipeline après reboot / interruption sans avoir à
 * rejouer manuellement les events.
 */
export const cronOutreachEnqueueQueued = inngest.createFunction(
  {
    id: "outreach-cron-enqueue-queued",
    retries: 0,
    triggers: [{ cron: "0 */1 * * *" }],
  },
  async ({ step }) => {
    const batchSize = 100;
    const queued = await step.run("fetch-queued", async (): Promise<{ id: string }[]> => {
      const rows = await prisma.prospectRestaurant.findMany({
        where: { status: "queued" },
        select: { id: true },
        take: batchSize,
        orderBy: { createdAt: "asc" },
      });
      return rows.map((r) => ({ id: r.id.toString() }));
    });

    if (queued.length === 0) return { enqueued: 0 };

    await step.sendEvent(
      "enqueue-batch",
      queued.map((p) => ({
        name: "prospect/enrich.requested" as const,
        data: { prospectId: p.id },
      })),
    );

    return { enqueued: queued.length };
  },
);

/**
 * Cron AI Marketer — chaque lundi à 9h UTC, génère un nouveau variant par
 * step de la campagne en cours (basé sur les stats Smartlead remontées).
 *
 * Coût Anthropic : ~$0.10 par exécution (4 calls × ~3000 tokens) →
 * ~$0.40/mois. Bien moins cher qu'un freelance marketing.
 *
 * Pré-requis : au moins 50 envois cumulés par step pour avoir un signal
 * statistique significatif.
 */
export const cronAiMarketer = inngest.createFunction(
  {
    id: "outreach-cron-ai-marketer",
    retries: 1,
    triggers: [{ cron: "0 9 * * MON" }],
  },
  async ({ step }) => {
    const ACTIVE_CAMPAIGN = "pilote-2k-2026-05";

    const result = await step.run("generate-variants", () =>
      aiMarketerWeeklyTick({
        campaign: ACTIVE_CAMPAIGN,
        minSentPerStep: 50,
      }),
    );

    return result;
  },
);
