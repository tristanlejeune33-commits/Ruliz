import "server-only";
import { prisma } from "@/lib/db";
import { enrichProspect } from "@/server/outreach/enrich";
import { generateCardForProspect } from "@/server/outreach/generate-card";
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

    await step.run("enrich", () => enrichProspect(prospectId));

    // Trigger l'étape suivante : génération de carte
    await step.sendEvent("trigger-generate", {
      name: "prospect/generate.requested",
      data: { prospectId: event.data.prospectId },
    });

    return { prospectId: event.data.prospectId, step: "enriched" };
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
