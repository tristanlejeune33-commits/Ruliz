"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { requireAdmin } from "@/lib/session";
import { inngest } from "@/server/inngest/client";
import { csvEscape, parseCsv } from "@/server/outreach/csv-parser";
import { seedEmailVariants } from "@/server/outreach/email-variants-seed";

const DEFAULT_CAMPAIGN = "pilote-2k-2026-05";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function s(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ────────────────────────────────────────────────────────────────────────────
// 1) Upload + Import CSV des prospects
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reçoit un CSV depuis le browser admin, parse et upsert dans
 * prospect_restaurants. Idempotent (relance OK sans doublon).
 *
 * Le CSV doit contenir : email, nom, ville, code_postal, adresse,
 * telephone, site_web, logo_url, photo_cover, rating, nb_reviews, niveau_prix.
 */
export async function uploadProspectsCsv(formData: FormData): Promise<
  ActionResult<{ inserted: number; updated: number; skipped: number; total: number }>
> {
  await requireAdmin();
  await ensureRuntimeSchema();

  const file = formData.get("file");
  const campaignField = formData.get("campaign");
  const campaign =
    typeof campaignField === "string" && campaignField.length > 0
      ? campaignField
      : DEFAULT_CAMPAIGN;

  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Aucun fichier fourni" };
  }

  if (file.size === 0) {
    return { ok: false, error: "Fichier vide" };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "Fichier trop volumineux (max 20 MB)" };
  }

  let content: string;
  try {
    content = await file.text();
  } catch (err) {
    return {
      ok: false,
      error: `Lecture fichier échouée : ${err instanceof Error ? err.message : "?"}`,
    };
  }

  const rows = parseCsv(content);
  if (rows.length === 0) {
    return { ok: false, error: "CSV vide ou mal formé" };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }

    const data = {
      source: campaign,
      email,
      nom: s(r.nom) ?? email,
      ville: s(r.ville),
      codePostal: s(r.code_postal),
      adresse: s(r.adresse),
      telephone: s(r.telephone),
      siteWeb: s(r.site_web),
      logoUrl: s(r.logo_url),
      photoCover: s(r.photo_cover),
      rating: r.rating ? parseFloat(r.rating) : null,
      nbReviews: r.nb_reviews ? parseInt(r.nb_reviews, 10) : null,
      niveauPrix: s(r.niveau_prix),
      status: "queued",
    };

    try {
      const existing = await prisma.prospectRestaurant.findUnique({
        where: { email },
        select: { id: true, status: true },
      });

      if (!existing) {
        await prisma.prospectRestaurant.create({ data });
        inserted++;
      } else if (existing.status === "queued") {
        await prisma.prospectRestaurant.update({
          where: { email },
          data,
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[upload-prospects] Failed for ${email}:`, err);
      skipped++;
    }
  }

  revalidatePath("/admin/outreach");

  return {
    ok: true,
    data: { inserted, updated, skipped, total: rows.length },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 2) Seeder les 12 variants d'emails
// ────────────────────────────────────────────────────────────────────────────

export async function triggerSeedVariants(): Promise<
  ActionResult<{ inserted: number; updated: number }>
> {
  await requireAdmin();
  await ensureRuntimeSchema();

  try {
    const result = await seedEmailVariants();
    revalidatePath("/admin/outreach");
    revalidatePath("/admin/outreach/variants");
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 3) Trigger le pipeline d'enrichissement (envoie un event par prospect queued)
// ────────────────────────────────────────────────────────────────────────────

export async function triggerEnrichmentPipeline(opts?: {
  campaign?: string;
  limit?: number;
}): Promise<ActionResult<{ enqueued: number }>> {
  await requireAdmin();
  await ensureRuntimeSchema();

  const campaign = opts?.campaign ?? DEFAULT_CAMPAIGN;
  const limit = opts?.limit ?? 500; // Sécurité : on n'envoie pas tout d'un coup

  const queued = await prisma.prospectRestaurant.findMany({
    where: { source: campaign, status: "queued" },
    select: { id: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  if (queued.length === 0) {
    return { ok: true, data: { enqueued: 0 } };
  }

  try {
    // Envoie par batch de 50 pour pas surcharger Inngest
    const BATCH = 50;
    for (let i = 0; i < queued.length; i += BATCH) {
      const batch = queued.slice(i, i + BATCH);
      await inngest.send(
        batch.map((p) => ({
          name: "prospect/enrich.requested" as const,
          data: { prospectId: p.id.toString() },
        })),
      );
    }
  } catch (err) {
    return {
      ok: false,
      error: `Inngest send failed: ${err instanceof Error ? err.message : "?"}`,
    };
  }

  revalidatePath("/admin/outreach");
  return { ok: true, data: { enqueued: queued.length } };
}

// ────────────────────────────────────────────────────────────────────────────
// 4) Générer le CSV Smartlead (downloadable)
// ────────────────────────────────────────────────────────────────────────────

const PREVIEW_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const candidate = local
    .replace(/[._-]/g, " ")
    .replace(/\d+/g, "")
    .split(" ")[0]
    ?.trim();
  if (!candidate || candidate.length < 2) return "bonjour";
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

/**
 * Retourne le CSV Smartlead sous forme de string base64 pour téléchargement
 * direct dans le navigateur.
 *
 * Ne sélectionne que les prospects en statut "generated" (carte prête,
 * cardToken assigné).
 */
export async function generateSmartleadCsv(opts?: {
  campaign?: string;
}): Promise<ActionResult<{ csvBase64: string; filename: string; rows: number }>> {
  await requireAdmin();
  await ensureRuntimeSchema();

  const campaign = opts?.campaign ?? DEFAULT_CAMPAIGN;

  const prospects = await prisma.prospectRestaurant.findMany({
    where: {
      source: campaign,
      status: "generated",
      cardToken: { not: null },
    },
    select: {
      email: true,
      nom: true,
      ville: true,
      cardToken: true,
    },
    orderBy: { rating: "desc" },
  });

  if (prospects.length === 0) {
    return {
      ok: false,
      error:
        "Aucun prospect en statut 'generated'. Lance d'abord le pipeline d'enrichissement.",
    };
  }

  const headers = ["email", "nom", "ville", "first_name", "preview_url"];
  const lines = [headers.join(",")];

  for (const p of prospects) {
    const row = {
      email: p.email,
      nom: p.nom,
      ville: p.ville ?? "",
      first_name: firstNameFromEmail(p.email),
      preview_url: `${PREVIEW_BASE_URL}/preview/${p.cardToken}`,
    };
    lines.push(
      headers.map((h) => csvEscape(row[h as keyof typeof row])).join(","),
    );
  }

  const csv = lines.join("\n");
  const csvBase64 = Buffer.from(csv, "utf8").toString("base64");
  const date = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    data: {
      csvBase64,
      filename: `smartlead-${campaign}-${date}.csv`,
      rows: prospects.length,
    },
  };
}
