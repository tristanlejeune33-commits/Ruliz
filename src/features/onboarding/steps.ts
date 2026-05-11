/**
 * Config des 12 étapes du tour onboarding.
 *
 * Structure :
 *  - Slides 1-10 = tour de base (mise en place de la carte)
 *  - Slides 11-12 = plus-value (features avancées qui font vendre)
 *
 * Chaque étape :
 *  - path  : route où la bulle doit emmener l'utilisateur via router.push()
 *  - anchorSelector : sélecteur CSS de l'élément à pointer (data-onboarding-anchor)
 *                     ou null pour la position par défaut (bottom-right)
 *  - title : 1 ligne, max 40 caractères
 *  - body  : 2 lignes max, ton tutoiement, zéro jargon
 *  - cta   : texte du bouton principal
 *  - kind  : "base" ou "value" (visuel différent pour les 2 dernières)
 */

export type StepKind = "base" | "value";

export interface OnboardingStep {
  id: number;
  path: string;
  anchorSelector: string | null;
  title: string;
  body: string;
  cta: string;
  allowSkip: boolean;
  /** Placement par défaut quand ancré */
  placement?: "top" | "bottom" | "left" | "right";
  /** "base" = parcours essentiel, "value" = features premium (slides 11-12) */
  kind: StepKind;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // =========================================================================
  // TOUR DE BASE — slides 1 à 10
  // =========================================================================
  {
    id: 1,
    path: "/dashboard",
    anchorSelector: null,
    title: "Salut 👋 Bienvenue dans Ruliz.",
    body: "Je te montre tout en 12 étapes — 3 minutes chrono. C'est parti ?",
    cta: "C'est parti →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 2,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-branding']",
    title: "Ton identité visuelle 🎨",
    body: "Logo (glisse ou Ctrl+V) et couleur principale — tout le reste s'adapte.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 3,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-infos']",
    title: "Infos pratiques 📍",
    body: "Adresse, téléphone, horaires — affichés sur ta carte pour rassurer tes clients.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 4,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-social']",
    title: "Réseaux & Google reviews 🌐",
    body: "Facebook, Insta, lien Google — affichés en haut de ta carte pour booster ton SEO local.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 5,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='add-category']",
    title: "Crée tes catégories 🍽️",
    body: "Entrées, Plats, Vins, Desserts… glisse pour réorganiser, autant que tu veux.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "right",
    kind: "base",
  },
  {
    id: 6,
    path: "/dashboard/menu",
    anchorSelector: null,
    title: "Ton premier produit 🍕",
    body: "Sélectionne une catégorie, puis clique « + Produit » pour ajouter un plat.",
    cta: "Suivant →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 7,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-photo']",
    title: "Astuce photos 📸",
    body: "Glisse une image, ou Ctrl+V une capture — pas besoin de la sauver avant.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 8,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-allergenes']",
    title: "Allergènes & vignettes 🌿",
    body: "Coche fait maison, végé, sans gluten, épicé — affiché en pills sur la fiche produit.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 9,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='preview-iframe']",
    title: "Aperçu live + 7 langues 🌍",
    body: "À droite : ce que tes clients voient. Change la langue, l'IA traduit automatiquement.",
    cta: "Voir mon QR →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 10,
    path: "/dashboard/qrcodes",
    anchorSelector: "[data-onboarding-anchor='qr-display']",
    title: "Ton QR code 📱",
    body: "Télécharge le PNG, imprime-le, pose-le sur tes tables. Pointe toujours vers la dernière version.",
    cta: "Voir les plus 🎁",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  // =========================================================================
  // PLUS-VALUE — slides 11 et 12 (features qui font vendre / fidéliser)
  // =========================================================================
  {
    id: 11,
    path: "/dashboard/jeu",
    anchorSelector: "[data-onboarding-anchor='jeu-page']",
    title: "🎁 Roulette d'avis Google",
    body: "Tes clients tournent la roue, gagnent un cadeau → laissent un avis Google. Boost SEO local immédiat.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "value",
  },
  {
    id: 12,
    path: "/dashboard/stats",
    anchorSelector: "[data-onboarding-anchor='stats-page']",
    title: "📊 Stats & Plan Premium",
    body: "Suis tes scans en temps réel. Plan Premium : sans branding Ruliz, multi-restos, SMS marketing.",
    cta: "Terminer 🎉",
    allowSkip: false,
    placement: "bottom",
    kind: "value",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
