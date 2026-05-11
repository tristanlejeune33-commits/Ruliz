/**
 * Config des 6 étapes du tour onboarding.
 *
 * Chaque étape :
 *  - path  : route où la bulle doit emmener l'utilisateur via router.push()
 *  - anchorSelector : sélecteur CSS de l'élément à pointer (data-onboarding-anchor)
 *                     ou null pour la position par défaut (bottom-right)
 *  - title : 1 ligne, max 40 caractères
 *  - body  : 2 lignes max, ton tutoiement, zéro jargon
 *  - cta   : texte du bouton principal
 *  - allowSkip : true sauf à la dernière étape
 *
 * IMPORTANT : les éléments du DOM ciblés DOIVENT porter l'attribut
 * `data-onboarding-anchor="<id>"` pour être trouvés (cf. anchorSelector ci-dessous).
 */

export interface OnboardingStep {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  path: string;
  anchorSelector: string | null;
  title: string;
  body: string;
  cta: string;
  allowSkip: boolean;
  /** Placement par défaut quand ancré, en mode flottant ignore */
  placement?: "top" | "bottom" | "left" | "right";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    path: "/dashboard",
    anchorSelector: null,
    title: "Salut 👋 Bienvenue dans Ruliz.",
    body: "Je te montre comment mettre ta carte en ligne en 2 minutes. C'est parti ?",
    cta: "C'est parti →",
    allowSkip: true,
  },
  {
    id: 2,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-branding']",
    title: "Ton identité visuelle",
    body: "Ajoute ton logo (glisse ou Ctrl+V) et choisis la couleur de ta carte.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
  },
  {
    id: 3,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='add-category']",
    title: "Crée tes catégories",
    body: "Entrées, Plats, Vins… autant que tu veux, glisse pour réorganiser.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "right",
  },
  {
    id: 4,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-photo']",
    title: "Astuce photos 📸",
    body: "Glisse une image, ou Ctrl+V une capture — pas besoin de la sauver avant.",
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
  },
  {
    id: 5,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='preview-iframe']",
    title: "Aperçu live",
    body: "Regarde à droite : c'est exactement ce que tes clients voient.",
    cta: "Voir mon QR →",
    allowSkip: true,
    placement: "left",
  },
  {
    id: 6,
    path: "/dashboard/qrcodes",
    anchorSelector: "[data-onboarding-anchor='qr-display']",
    title: "Scanne-toi avec ton phone",
    body: "Sors ton téléphone, scanne — c'est ce que tes clients verront.",
    cta: "Terminer 🎉",
    allowSkip: false,
    placement: "left",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
