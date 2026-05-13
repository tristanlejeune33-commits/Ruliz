"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

const updatePackSchema = z.object({
  packId: z.enum(["starter", "boost", "growth", "scale"]),
  size: z.number().int().min(1).max(100000),
  priceCentimes: z.number().int().min(0).max(10000000), // max 100 000€
  label: z.string().min(1).max(100),
  badge: z.string().max(50).optional().or(z.literal("")),
  active: z.boolean(),
});

/**
 * Met à jour un pack SMS depuis /admin/settings.
 * Admin uniquement (requireAdmin) · un client ne peut PAS toucher aux prix.
 */
export async function updateSmsPackSetting(
  input: unknown,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = updatePackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const { packId, size, priceCentimes, label, badge, active } = parsed.data;

  try {
    // UPSERT : crée si absent, met à jour sinon
    await prisma.$executeRawUnsafe(
      `INSERT INTO sms_pack_settings (pack_id, size, price_centimes, label, badge, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (pack_id) DO UPDATE SET
         size = EXCLUDED.size,
         price_centimes = EXCLUDED.price_centimes,
         label = EXCLUDED.label,
         badge = EXCLUDED.badge,
         active = EXCLUDED.active,
         updated_at = NOW()`,
      packId,
      size,
      priceCentimes,
      label,
      badge && badge.trim().length > 0 ? badge : null,
      active,
    );

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard/sms");
    return { ok: true };
  } catch (err) {
    console.error("[admin] updateSmsPackSetting failed:", err);
    return { ok: false, error: "Mise à jour échouée" };
  }
}
