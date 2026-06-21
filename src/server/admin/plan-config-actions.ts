"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { requireAdmin } from "@/lib/session";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const featuresSchema = z.object({
  maxRestaurants: z.number().int().min(0).max(100000).nullable(),
  maxQrcodes: z.number().int().min(0).max(100000).nullable(),
  maxProduits: z.number().int().min(0).max(100000).nullable(),
  maxTeamMembers: z.number().int().min(0).max(100000).nullable(),
  iaTranslation: z.boolean(),
  rouletteGame: z.boolean(),
  popups: z.boolean(),
  advancedStats: z.boolean(),
  customDomain: z.boolean(),
  smsMarketing: z.boolean(),
  removeBranding: z.boolean(),
});

const planSchema = z.object({
  plan: z.enum(["freemium", "pro", "premium"]),
  name: z.string().min(1).max(100),
  monthlyPriceHT: z.number().min(0).max(100000),
  yearlyPriceHT: z.number().min(0).max(1000000).nullable(),
  stripePriceIdMonthly: z.string().max(255).optional().or(z.literal("")),
  stripePriceIdYearly: z.string().max(255).optional().or(z.literal("")),
  features: featuresSchema,
});

const saveSchema = z.object({
  plans: z.array(planSchema).min(1).max(3),
});

/**
 * Enregistre la configuration des plans (matrice plan × fonctionnalité) depuis
 * /admin/settings. Admin uniquement. UPSERT 1 ligne par plan dans plan_configs.
 * Le plan démo n'est pas stocké (toujours tout activé via le gating).
 */
export async function savePlanConfig(
  input: unknown,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  try {
    await ensureRuntimeSchema();
    for (const p of parsed.data.plans) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO plan_configs
           (plan, name, monthly_price_ht, yearly_price_ht,
            stripe_price_id_monthly, stripe_price_id_yearly, features, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
         ON CONFLICT (plan) DO UPDATE SET
           name = EXCLUDED.name,
           monthly_price_ht = EXCLUDED.monthly_price_ht,
           yearly_price_ht = EXCLUDED.yearly_price_ht,
           stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
           stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
           features = EXCLUDED.features,
           updated_at = NOW()`,
        p.plan,
        p.name,
        p.monthlyPriceHT,
        p.yearlyPriceHT,
        p.stripePriceIdMonthly && p.stripePriceIdMonthly.trim().length > 0
          ? p.stripePriceIdMonthly.trim()
          : null,
        p.stripePriceIdYearly && p.stripePriceIdYearly.trim().length > 0
          ? p.stripePriceIdYearly.trim()
          : null,
        JSON.stringify(p.features),
      );
    }

    // Le gating lit plan_configs partout → on rafraîchit les surfaces clés.
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    revalidatePath("/pricing");
    return { ok: true };
  } catch (err) {
    console.error("[admin] savePlanConfig failed:", err);
    return { ok: false, error: "Mise à jour échouée" };
  }
}
