import "server-only";
import { redirect } from "next/navigation";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import {
  ALL_FEATURES_ON,
  isAtLeastPlan,
  type Plan,
  type PlanFeatures,
} from "@/lib/plans";
import { canUseFeatureInConfig, getPlanConfig } from "@/lib/plan-config";

/**
 * Shape minimale du restaurant nécessaire au calcul du plan effectif.
 * Compatible avec le modèle Prisma Restaurant (tous ces champs existent).
 */
interface RestaurantPlanInfo {
  plan: string;
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  planOffertExpiresAt?: Date | null;
}

/**
 * Calcule le plan EFFECTIF d'un restaurant (freemium/pro/premium).
 * Cf. règles Stripe + grace period + cadeau admin ci-dessous.
 */
export function getEffectivePlan(resto: RestaurantPlanInfo): Plan {
  const dbPlan = (resto.plan as Plan) ?? "freemium";
  if (dbPlan === "freemium") return "freemium";

  const now = Date.now();

  const stripeStatus = resto.stripeSubscriptionStatus;
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return dbPlan;
  }
  if (
    resto.stripeCurrentPeriodEnd &&
    new Date(resto.stripeCurrentPeriodEnd).getTime() > now
  ) {
    return dbPlan;
  }
  if (
    resto.planOffertExpiresAt &&
    new Date(resto.planOffertExpiresAt).getTime() > now
  ) {
    return dbPlan;
  }

  return "freemium";
}

/**
 * Retourne le jeu de fonctionnalités EFFECTIF d'un restaurant, en tenant
 * compte de la config admin ET du plan DÉMO :
 *   - resto appartenant à un compte ADMIN → accès à TOUT (plan démo).
 *   - sinon → features du plan effectif, telles que configurées en DB.
 */
async function effectiveFeaturesOf(
  restaurant: RestaurantPlanInfo & { userId: number },
): Promise<PlanFeatures> {
  // Bypass démo : le restaurant de démo est rattaché au compte admin (Tristan)
  // et doit toujours montrer 100% des fonctionnalités, quel que soit le
  // réglage des autres plans.
  const owner = await prisma.user.findUnique({
    where: { id: restaurant.userId },
    select: { role: true },
  });
  if (owner?.role === "admin") return ALL_FEATURES_ON;

  const config = await getPlanConfig();
  return config[getEffectivePlan(restaurant)].features;
}

function featureAllowed(v: boolean | number | null): boolean {
  return typeof v === "boolean" ? v : v !== 0;
}

/**
 * Server-side guard pour les PAGES : redirige vers /dashboard/billing si le
 * restaurant actif n'a pas le plan requis. (Comparaison d'ordre de plan.)
 */
export async function requirePlan(target: Plan) {
  const { restaurant, session } = await getCurrentRestaurant();
  if (!isAtLeastPlan(getEffectivePlan(restaurant), target)) {
    redirect(`/dashboard/billing?upgrade=${target}`);
  }
  return { restaurant, session };
}

export async function requireFeature(feature: keyof PlanFeatures) {
  const { restaurant, session } = await getCurrentRestaurant();
  const features = await effectiveFeaturesOf(restaurant);
  if (!featureAllowed(features[feature])) {
    redirect(`/dashboard/billing?feature=${String(feature)}`);
  }
  return { restaurant, session };
}

/** Labels FR des features pour les messages d'erreur. */
const FEATURE_LABELS: Partial<Record<keyof PlanFeatures, string>> = {
  rouletteGame: "Le jeu roulette",
  popups: "Les pop-ups événements",
  smsMarketing: "Le module SMS",
  iaTranslation: "La traduction automatique",
  advancedStats: "Les statistiques avancées",
  customDomain: "Le domaine personnalisé",
};

type AssertResult =
  | {
      ok: true;
      plan: Plan;
      restaurant: Awaited<ReturnType<typeof getCurrentRestaurant>>["restaurant"];
    }
  | { ok: false; error: string };

/**
 * Guard pour SERVER ACTIONS : vérifie qu'une feature booléenne est incluse
 * dans le plan effectif (ou que le resto est en démo/admin → tout permis).
 * Retourne { ok: false, error } au lieu d'un redirect.
 */
export async function assertFeature(
  feature: keyof PlanFeatures,
): Promise<AssertResult> {
  const { restaurant } = await getCurrentRestaurant();
  const plan = getEffectivePlan(restaurant);
  const features = await effectiveFeaturesOf(restaurant);
  if (!featureAllowed(features[feature])) {
    const config = await getPlanConfig();
    const label = FEATURE_LABELS[feature] ?? "Cette fonctionnalité";
    const minPlan = (["pro", "premium"] as Plan[]).find((p) =>
      canUseFeatureInConfig(config, p, feature),
    );
    return {
      ok: false,
      error: `${label} nécessite le plan ${minPlan ? config[minPlan].name : "Pro"}. Passe à l'offre supérieure depuis Facturation.`,
    };
  }
  return { ok: true, plan, restaurant };
}

/**
 * Guard quota numérique pour SERVER ACTIONS (maxProduits, maxQrcodes…).
 * `currentCount` = le nombre d'éléments existants AVANT la création.
 */
export async function assertWithinLimit(
  feature: "maxProduits" | "maxQrcodes",
  currentCount: number,
): Promise<AssertResult> {
  const { restaurant } = await getCurrentRestaurant();
  const plan = getEffectivePlan(restaurant);
  const features = await effectiveFeaturesOf(restaurant);
  const max = features[feature];
  if (max !== null && currentCount >= max) {
    const config = await getPlanConfig();
    const planName = config[plan].name;
    const label =
      feature === "maxProduits"
        ? `produits (${max} max sur le plan ${planName})`
        : `QR codes (${max} max sur le plan ${planName})`;
    return {
      ok: false,
      error: `Limite de ${label} atteinte. Passe à l'offre supérieure pour en ajouter d'autres.`,
    };
  }
  return { ok: true, plan, restaurant };
}

export async function getFeatureUsage() {
  const { restaurant } = await getCurrentRestaurant();
  const plan = getEffectivePlan(restaurant);
  const features = await effectiveFeaturesOf(restaurant);
  return { plan, features };
}
