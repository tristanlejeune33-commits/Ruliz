/**
 * Config des packs SMS proposés à l'achat.
 *
 * Fichier séparé de sms-actions.ts car Next.js refuse l'export de
 * constantes depuis un fichier "use server" (seules les async functions
 * sont autorisées).
 */

export interface SmsPack {
  id: "starter" | "boost" | "growth" | "scale";
  size: number;
  priceCentimes: number;
  label: string;
  badge?: string;
}

/**
 * Tristan achète sur Brevo ~0.030€/SMS, revend avec marge :
 *  - 100 SMS  → 9.90€  (0.099€/SMS) → marge ×3.3
 *  - 500 SMS  → 39.90€ (0.080€/SMS) → marge ×2.7
 *  - 1000 SMS → 69.90€ (0.070€/SMS) → marge ×2.3
 *  - 5000 SMS → 299€   (0.060€/SMS) → marge ×2.0
 */
export const SMS_PACKS: SmsPack[] = [
  { id: "starter", size: 100, priceCentimes: 990, label: "Pack Découverte" },
  {
    id: "boost",
    size: 500,
    priceCentimes: 3990,
    label: "Pack Boost",
    badge: "Populaire",
  },
  {
    id: "growth",
    size: 1000,
    priceCentimes: 6990,
    label: "Pack Croissance",
  },
  {
    id: "scale",
    size: 5000,
    priceCentimes: 29900,
    label: "Pack Maxi",
    badge: "Économie",
  },
];
