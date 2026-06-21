import "server-only";
import { prisma } from "@/lib/db";
import {
  PLANS,
  PLAN_ORDER,
  type Plan,
  type PlanConfig,
  type PlanFeatures,
} from "@/lib/plans";

/**
 * Charge la configuration EFFECTIVE des plans (matrice plan × fonctionnalité).
 *
 * Source de vérité : table `plan_configs` (éditée par l'admin via
 * /admin/settings). Pour chaque champ absent en DB, on retombe sur les défauts
 * codés dans src/lib/plans.ts → zéro régression tant que l'admin n'a rien
 * touché, et forward-compatible (une nouvelle feature ajoutée aux défauts
 * apparaît automatiquement, gérée par le merge).
 *
 * Si la table n'existe pas encore (déploiement avant ensureRuntimeSchema) ou
 * en cas d'erreur DB → on retourne simplement les défauts (jamais de crash).
 *
 * Pas de cache : 3 lignes indexées par PK, lues uniquement sur les chemins
 * dashboard/admin (pas la carte publique). Coût négligeable.
 */
type PlanConfigRow = {
  plan: string;
  name: string | null;
  monthly_price_ht: unknown;
  yearly_price_ht: unknown;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: unknown;
};

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function getPlanConfig(): Promise<Record<Plan, PlanConfig>> {
  // Defaults profonds (on ne mute jamais l'objet PLANS partagé).
  const config = structuredClone(PLANS) as Record<Plan, PlanConfig>;

  let rows: PlanConfigRow[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<PlanConfigRow[]>(
      `SELECT plan, name, monthly_price_ht, yearly_price_ht,
              stripe_price_id_monthly, stripe_price_id_yearly, features
       FROM plan_configs`,
    );
  } catch {
    // Table absente / DB indisponible → défauts.
    return config;
  }

  for (const row of rows) {
    const plan = row.plan as Plan;
    if (!PLAN_ORDER.includes(plan)) continue;
    const base = config[plan];
    const dbFeatures =
      row.features && typeof row.features === "object"
        ? (row.features as Partial<PlanFeatures>)
        : {};

    const monthly = toNumberOrNull(row.monthly_price_ht);
    const yearly = toNumberOrNull(row.yearly_price_ht);

    config[plan] = {
      ...base,
      name: row.name ?? base.name,
      monthlyPriceHT: monthly ?? base.monthlyPriceHT,
      yearlyPriceHT: yearly !== null ? yearly : base.yearlyPriceHT,
      stripePriceIdMonthly:
        row.stripe_price_id_monthly ?? base.stripePriceIdMonthly,
      stripePriceIdYearly:
        row.stripe_price_id_yearly ?? base.stripePriceIdYearly,
      // Merge feature par feature : tout champ absent en DB garde le défaut.
      features: { ...base.features, ...dbFeatures },
    };
  }

  return config;
}

/**
 * Mapping INVERSE : depuis un price ID Stripe (mensuel ou annuel), retrouve le
 * plan correspondant en tenant compte des IDs configurés en admin (sinon
 * défauts env). Utilisé par le webhook Stripe + la resync d'abonnement.
 */
export async function resolvePlanFromPriceId(
  priceId: string | null | undefined,
): Promise<Plan> {
  if (!priceId) return "freemium";
  const config = await getPlanConfig();
  for (const plan of PLAN_ORDER) {
    const c = config[plan];
    if (priceId === c.stripePriceIdMonthly || priceId === c.stripePriceIdYearly) {
      return plan;
    }
  }
  return "freemium";
}

/**
 * Vérifie une feature contre une config déjà chargée. Booléen → sa valeur ;
 * limite numérique → utilisable sauf si plafond = 0 (null = illimité = ok).
 */
export function canUseFeatureInConfig(
  config: Record<Plan, PlanConfig>,
  plan: Plan,
  feature: keyof PlanFeatures,
): boolean {
  const v = config[plan].features[feature];
  return typeof v === "boolean" ? v : v !== 0;
}
