/**
 * Plans Ruliz et matrice de fonctionnalités.
 * Pure TypeScript safe to import from Server ET Client Components.
 */

export type Plan = "freemium" | "pro" | "premium";

export interface PlanConfig {
  id: Plan;
  name: string;
  monthlyPriceHT: number;
  yearlyPriceHT: number | null;
  /** Stripe price IDs (null pour freemium). */
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: PlanFeatures;
  highlighted?: boolean;
  cta: string;
}

export interface PlanFeatures {
  /** Nombre maximum de restaurants (null = illimité). */
  maxRestaurants: number | null;
  /** Nombre de QR codes par restaurant (null = illimité). */
  maxQrcodes: number | null;
  /** Nombre de produits par carte (null = illimité). */
  maxProduits: number | null;
  /** Nombre maximum de membres d'équipe par compte (null = illimité). */
  maxTeamMembers: number | null;
  /** Traduction Anthropic activée. */
  iaTranslation: boolean;
  /** Jeu roulette d'avis activé. */
  rouletteGame: boolean;
  /** Pop-ups événements. */
  popups: boolean;
  /** Stats avancées (heatmap horaire, langues, top produits). */
  advancedStats: boolean;
  /** Domaine personnalisé pour la carte publique. */
  customDomain: boolean;
  /** Module SMS marketing. */
  smsMarketing: boolean;
  /** Suppression du watermark "Propulsé par Ruliz". */
  removeBranding: boolean;
}

export const PLANS: Record<Plan, PlanConfig> = {
  freemium: {
    id: "freemium",
    name: "Freemium",
    monthlyPriceHT: 0,
    yearlyPriceHT: 0,
    cta: "Démarrer gratuitement",
    features: {
      maxRestaurants: 1,
      maxQrcodes: 1,
      maxProduits: 30,
      maxTeamMembers: 1,
      // Traduction IA dispo sur TOUS les plans : c'est la promesse cœur de
      // Ruliz (cartes multilingues), et l'auto-traduction n'était déjà pas
      // gatée. Débloque le bouton « Re-traduire » + l'affiche dans la
      // comparaison de prix pour le freemium.
      iaTranslation: true,
      rouletteGame: false,
      popups: false,
      advancedStats: false,
      customDomain: false,
      smsMarketing: false,
      removeBranding: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceHT: 29.9,
    yearlyPriceHT: 287, // 29.9 × 12 - 20% ≈ 287
    stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID,
    cta: "Essayer Pro 14 jours",
    highlighted: true,
    features: {
      maxRestaurants: 3,
      maxQrcodes: null,
      maxProduits: null,
      maxTeamMembers: 3,
      iaTranslation: true,
      rouletteGame: true,
      popups: true,
      advancedStats: true,
      customDomain: false,
      smsMarketing: false,
      removeBranding: false,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPriceHT: 44.9,
    yearlyPriceHT: 431, // 44.9 × 12 - 20%
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID,
    cta: "Passer Premium",
    features: {
      maxRestaurants: null,
      maxQrcodes: null,
      maxProduits: null,
      maxTeamMembers: null,
      iaTranslation: true,
      rouletteGame: true,
      popups: true,
      advancedStats: true,
      customDomain: true,
      smsMarketing: true,
      removeBranding: true,
    },
  },
};

export const PLAN_ORDER: Plan[] = ["freemium", "pro", "premium"];

/**
 * Jeu de fonctionnalités "tout activé" — utilisé pour le plan DÉMO (le resto
 * admin a accès à 100% des features, quel que soit le réglage des autres plans).
 */
export const ALL_FEATURES_ON: PlanFeatures = {
  maxRestaurants: null,
  maxQrcodes: null,
  maxProduits: null,
  maxTeamMembers: null,
  iaTranslation: true,
  rouletteGame: true,
  popups: true,
  advancedStats: true,
  customDomain: true,
  smsMarketing: true,
  removeBranding: true,
};

/** Limites numériques (null = illimité) — métadonnées pour l'éditeur admin. */
export const LIMIT_FIELDS = [
  { key: "maxRestaurants", label: "Restaurants max" },
  { key: "maxQrcodes", label: "QR codes max (par resto)" },
  { key: "maxProduits", label: "Produits max (par carte)" },
  { key: "maxTeamMembers", label: "Membres d'équipe max" },
] as const satisfies ReadonlyArray<{
  key: keyof PlanFeatures;
  label: string;
}>;

/** Fonctionnalités booléennes (activé / désactivé) — métadonnées éditeur. */
export const TOGGLE_FIELDS = [
  { key: "iaTranslation", label: "Traduction IA multilingue" },
  { key: "rouletteGame", label: "Jeu roulette d'avis" },
  { key: "popups", label: "Pop-ups événements" },
  { key: "advancedStats", label: "Statistiques avancées" },
  { key: "customDomain", label: "Accès au site vitrine" },
  { key: "smsMarketing", label: "SMS marketing" },
  { key: "removeBranding", label: "Retirer le watermark « Propulsé par Ruliz »" },
] as const satisfies ReadonlyArray<{
  key: keyof PlanFeatures;
  label: string;
}>;

export type LimitKey = (typeof LIMIT_FIELDS)[number]["key"];
export type ToggleKey = (typeof TOGGLE_FIELDS)[number]["key"];

export function planRank(p: Plan): number {
  return PLAN_ORDER.indexOf(p);
}

export function isAtLeastPlan(current: Plan, target: Plan): boolean {
  return planRank(current) >= planRank(target);
}

export function priceIdToPlan(priceId: string | null | undefined): Plan {
  if (!priceId) return "freemium";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium";
  return "freemium";
}

/**
 * Retourne true si le restaurant peut utiliser cette feature avec son plan actuel.
 */
export function canUseFeature(plan: Plan, feature: keyof PlanFeatures): boolean {
  const v = PLANS[plan].features[feature];
  return typeof v === "boolean" ? v : v !== 0;
}

/**
 * Format un prix de PLAN (Freemium = "Gratuit", Pro = "29,90 €").
 * À utiliser UNIQUEMENT pour les cartes "tarif d'un plan", pas pour des
 * montants financiers où "0 €" doit s'afficher en chiffres (cf. formatEuro).
 */
export function formatPriceEuro(priceHT: number): string {
  if (priceHT === 0) return "Gratuit";
  return `${priceHT.toFixed(2).replace(".", ",")} €`;
}

/**
 * Format un MONTANT financier brut (MRR, ARR, CA, factures).
 * Toujours en chiffres + symbole €, jamais "Gratuit" même si 0.
 * Ex: 0 → "0,00 €" ; 29.9 → "29,90 €" ; 1234.5 → "1 234,50 €"
 */
export function formatEuro(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  // Sépare les milliers par espace (style FR)
  const intWithSpaces = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${intWithSpaces},${decPart ?? "00"} €`;
}
