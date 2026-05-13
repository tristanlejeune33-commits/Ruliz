"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { requireAdmin } from "@/lib/session";

/**
 * Frais de port boutique modèle par paliers de poids (Colissimo-like).
 *
 * - `active` : on/off global (si off → 0€ peu importe le poids)
 * - `freeThresholdCentimes` : seuil "livraison offerte" sur le sous-total
 *   panier HT ; 0 = pas de seuil
 * - `label` : libellé client générique ("Frais de port France métropolitaine")
 * - `tiers` : paliers tarifaires triés par max_grams croissant. Le calcul
 *   prend le 1er palier dont `max_grams` ≥ poids_total_panier. Si le poids
 *   dépasse tous les paliers, on prend le dernier (le plus lourd).
 */
export type ShippingTier = {
  id: string;
  maxGrams: number;
  feeCentimes: number;
  label: string;
  position: number;
};

export type ShippingSettings = {
  feeCentimes: number; // Conservé pour compat = 1er palier si tiers, sinon flat
  freeThresholdCentimes: number;
  label: string;
  active: boolean;
  tiers: ShippingTier[];
};

const DEFAULT_SETTINGS: ShippingSettings = {
  feeCentimes: 515,
  freeThresholdCentimes: 0,
  label: "Frais de port France métropolitaine",
  active: true,
  tiers: [],
};

/**
 * Lit les paramètres + les paliers triés par poids.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  await ensureRuntimeSchema();
  try {
    const settingsRows = (await prisma.$queryRawUnsafe(
      `SELECT fee_centimes AS "feeCentimes",
              free_threshold_centimes AS "freeThresholdCentimes",
              label, active
       FROM boutique_shipping_settings WHERE id = 1 LIMIT 1`,
    )) as Array<Omit<ShippingSettings, "tiers">>;

    const tierRows = (await prisma.$queryRawUnsafe(
      `SELECT id::text AS id,
              max_grams      AS "maxGrams",
              fee_centimes   AS "feeCentimes",
              label,
              position
       FROM boutique_shipping_tiers
       ORDER BY position ASC, max_grams ASC`,
    )) as ShippingTier[];

    const base = settingsRows[0] ?? DEFAULT_SETTINGS;
    return {
      ...base,
      tiers: tierRows,
    };
  } catch (err) {
    console.warn("[shipping] getShippingSettings failed:", err);
    return DEFAULT_SETTINGS;
  }
}

const tierSchema = z.object({
  id: z.string().optional(), // vide si nouveau
  maxGrams: z.number().int().positive().max(100000), // max 100 kg
  feeCentimes: z.number().int().nonnegative().max(50000),
  label: z.string().max(100).default(""),
  position: z.number().int().nonnegative().default(0),
});

const updateSchema = z.object({
  feeCentimes: z.number().int().min(0).max(50000),
  freeThresholdCentimes: z.number().int().min(0).max(1000000),
  label: z.string().min(1).max(100),
  active: z.boolean(),
  tiers: z.array(tierSchema).max(30),
});

export async function updateShippingSettings(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  await ensureRuntimeSchema();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  try {
    // 1. Settings globaux
    await prisma.$executeRawUnsafe(
      `INSERT INTO boutique_shipping_settings
         (id, fee_centimes, free_threshold_centimes, label, active, updated_at)
       VALUES (1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         fee_centimes = EXCLUDED.fee_centimes,
         free_threshold_centimes = EXCLUDED.free_threshold_centimes,
         label = EXCLUDED.label,
         active = EXCLUDED.active,
         updated_at = NOW()`,
      parsed.data.feeCentimes,
      parsed.data.freeThresholdCentimes,
      parsed.data.label,
      parsed.data.active,
    );

    // 2. Tiers : on remplace TOUT (delete + insert) pattern le plus simple
    //    quand le nombre de lignes est petit (< 30) et que l'admin pilote
    //    l'ordre via la position client-side.
    await prisma.$executeRawUnsafe(`DELETE FROM boutique_shipping_tiers`);
    for (const t of parsed.data.tiers) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO boutique_shipping_tiers
           (max_grams, fee_centimes, label, position, updated_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        t.maxGrams,
        t.feeCentimes,
        t.label,
        t.position,
      );
    }

    revalidatePath("/admin/boutique");
    revalidatePath("/dashboard/boutique");
    revalidatePath("/dashboard/boutique/panier");
    return { ok: true };
  } catch (err) {
    console.error("[shipping] updateShippingSettings failed:", err);
    return { ok: false, error: "Mise à jour échouée" };
  }
}

/**
 * Calcule les frais de port selon le poids total du panier.
 *
 * - Si shipping désactivé → 0
 * - Si sous-total ≥ seuil livraison offerte → 0
 * - Sinon : prend le 1er palier dont `maxGrams ≥ totalWeightGrams`
 * - Si le poids dépasse tous les paliers → dernier palier (le plus lourd)
 * - Si aucun tier défini → fallback sur `feeCentimes` (mode forfaitaire legacy)
 */
export async function calcShippingCentimes(opts: {
  subtotalCentimes: number;
  totalWeightGrams: number;
}): Promise<number> {
  const settings = await getShippingSettings();
  if (!settings.active) return 0;
  if (
    settings.freeThresholdCentimes > 0 &&
    opts.subtotalCentimes >= settings.freeThresholdCentimes
  ) {
    return 0;
  }
  // Pas de tiers configurés → fallback forfaitaire
  if (settings.tiers.length === 0) {
    return settings.feeCentimes;
  }
  // Trie par maxGrams croissant pour trouver le palier applicable
  const sorted = [...settings.tiers].sort((a, b) => a.maxGrams - b.maxGrams);
  const tier =
    sorted.find((t) => opts.totalWeightGrams <= t.maxGrams) ??
    sorted[sorted.length - 1];
  return tier?.feeCentimes ?? settings.feeCentimes;
}
