import "server-only";
import { redirect } from "next/navigation";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import {
  canUseFeature,
  isAtLeastPlan,
  PLANS,
  type Plan,
  type PlanFeatures,
} from "@/lib/plans";

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
 * Calcule le plan EFFECTIF d'un restaurant — c'est LA fonction à utiliser
 * pour tout gating de feature.
 *
 * Pourquoi pas `restaurant.plan` directement : la colonne DB est écrite
 * "premium" à la création (cadeau de bienvenue 14j) et n'est JAMAIS
 * revertie à l'expiration (aucun cron). Sans ce calcul, tous les comptes
 * restent premium à vie → le gating des plans ne fonctionne pas.
 *
 * Règles :
 *   1. plan DB = freemium → freemium (rien à vérifier)
 *   2. Abonnement Stripe actif (active/trialing) → plan DB honoré (payé)
 *   3. Pas de statut Stripe mais période payée pas finie
 *      (stripeCurrentPeriodEnd > now) → plan DB honoré (legacy/grace)
 *   4. Cadeau admin/bienvenue encore valide (planOffertExpiresAt > now)
 *      → plan DB honoré
 *   5. Sinon → freemium (trial expiré sans abonnement)
 */
export function getEffectivePlan(resto: RestaurantPlanInfo): Plan {
  const dbPlan = (resto.plan as Plan) ?? "freemium";
  if (dbPlan === "freemium") return "freemium";

  const now = Date.now();

  // Abonnement Stripe en règle
  const stripeStatus = resto.stripeSubscriptionStatus;
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return dbPlan;
  }
  // Grace period : la période déjà payée court toujours (couvre aussi les
  // webhooks de cancellation reçus avant la fin de période)
  if (
    resto.stripeCurrentPeriodEnd &&
    new Date(resto.stripeCurrentPeriodEnd).getTime() > now
  ) {
    return dbPlan;
  }
  // Cadeau de bienvenue / plan offert par l'admin encore valide
  if (
    resto.planOffertExpiresAt &&
    new Date(resto.planOffertExpiresAt).getTime() > now
  ) {
    return dbPlan;
  }

  // Plan pro/premium en DB mais ni payé ni offert → downgrade effectif
  return "freemium";
}

/**
 * Server-side guard : redirect to /dashboard/billing if the active restaurant
 * doesn't have the required plan. À utiliser dans les PAGES (Server
 * Components) — pour les server actions, utiliser assertFeature qui
 * retourne une erreur au lieu de rediriger.
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
  if (!canUseFeature(getEffectivePlan(restaurant), feature)) {
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
  | { ok: true; plan: Plan; restaurant: Awaited<ReturnType<typeof getCurrentRestaurant>>["restaurant"] }
  | { ok: false; error: string };

/**
 * Guard pour SERVER ACTIONS : vérifie qu'une feature booléenne est incluse
 * dans le plan effectif du restaurant actif. Retourne { ok: false, error }
 * (au lieu d'un redirect, inutilisable dans une mutation).
 *
 * Usage :
 *   const gate = await assertFeature("rouletteGame");
 *   if (!gate.ok) return gate; // ActionResult-compatible
 */
export async function assertFeature(
  feature: keyof PlanFeatures,
): Promise<AssertResult> {
  const { restaurant } = await getCurrentRestaurant();
  const plan = getEffectivePlan(restaurant);
  if (!canUseFeature(plan, feature)) {
    const label = FEATURE_LABELS[feature] ?? "Cette fonctionnalité";
    // Trouve le plan minimum qui inclut la feature pour un message utile
    const minPlan = (["pro", "premium"] as Plan[]).find((p) =>
      canUseFeature(p, feature),
    );
    return {
      ok: false,
      error: `${label} nécessite le plan ${minPlan ? PLANS[minPlan].name : "Pro"}. Passe à l'offre supérieure depuis Facturation.`,
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
  const max = PLANS[plan].features[feature];
  if (max !== null && currentCount >= max) {
    const label =
      feature === "maxProduits"
        ? `produits (${max} max sur le plan ${PLANS[plan].name})`
        : `QR codes (${max} max sur le plan ${PLANS[plan].name})`;
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
  return { plan, features: PLANS[plan].features };
}
