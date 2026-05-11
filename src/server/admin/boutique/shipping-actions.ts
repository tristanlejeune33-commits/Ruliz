"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { requireAdmin } from "@/lib/session";

export type ShippingSettings = {
  feeCentimes: number;
  freeThresholdCentimes: number;
  label: string;
  active: boolean;
};

const DEFAULT_SETTINGS: ShippingSettings = {
  feeCentimes: 590, // 5,90€
  freeThresholdCentimes: 0,
  label: "Frais de port France métropolitaine",
  active: true,
};

/**
 * Lit les paramètres frais de port (1 seule ligne globale id=1).
 * Si la table est vide ou injoignable, retourne les défauts.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  await ensureRuntimeSchema();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT fee_centimes AS "feeCentimes",
              free_threshold_centimes AS "freeThresholdCentimes",
              label, active
       FROM boutique_shipping_settings WHERE id = 1 LIMIT 1`,
    )) as ShippingSettings[];
    return rows[0] ?? DEFAULT_SETTINGS;
  } catch (err) {
    console.warn("[shipping] getShippingSettings failed:", err);
    return DEFAULT_SETTINGS;
  }
}

const updateSchema = z.object({
  feeCentimes: z.number().int().min(0).max(50000), // max 500€ (au cas où)
  freeThresholdCentimes: z.number().int().min(0).max(1000000), // max 10000€
  label: z.string().min(1).max(100),
  active: z.boolean(),
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
 * Calcule les frais de port à appliquer pour un sous-total donné.
 * Retourne 0 si shipping désactivé ou si le sous-total dépasse le seuil
 * "livraison offerte".
 */
export async function calcShippingCentimes(
  subtotalCentimes: number,
): Promise<number> {
  const settings = await getShippingSettings();
  if (!settings.active) return 0;
  if (
    settings.freeThresholdCentimes > 0 &&
    subtotalCentimes >= settings.freeThresholdCentimes
  ) {
    return 0;
  }
  return settings.feeCentimes;
}
