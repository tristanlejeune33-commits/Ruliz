import type { PublicMenu } from "@/server/public/menu";

/**
 * Theme de la carte publique réplique exacte de l'ancien template Ruliz.
 *
 * Palette par défaut (light mode) :
 *   --primary       : #011255  (navy bleu marine, accordéons fermés + titres)
 *   --bg-subcat     : #ead04d  (jaune doré, sous-catégories)
 *   --bg-tag        : #000     (badges "Nouveau", "Origine FR")
 *   --text-tag      : #fff
 *   --bg-body       : #fff
 *   --card-body     : #fff
 *   --text-body     : #000
 *   --navbar        : #000     (header en mode sombre quand scroll)
 *
 * Le restaurateur peut surcharger primary/title/fond via le dashboard.
 */
export interface CarteTheme {
  isDark: boolean;
  /** Bleu marine accordéons catégories, h1 du restaurant */
  primary: string;
  textOnPrimary: string;
  /** Jaune accordéons sous-catégories */
  bgSubcat: string;
  textOnSubcat: string;
  /** Tag "Nouveau" fond noir / texte blanc */
  bgTag: string;
  textTag: string;
  /** Page background */
  bgBody: string;
  /** Cards (modal, items, suggestions) */
  cardBody: string;
  /** Text body principal */
  textBody: string;
  /** Couleur des h1/h2 (souvent = primary) */
  title: string;
  /** Header en mode dark sticky */
  navbar: string;
  /** Border-radius commun */
  radius: string;
  /** Shadow soft commune */
  shadow: string;
}

const DEFAULTS_LIGHT: CarteTheme = {
  isDark: false,
  primary: "#011255",
  textOnPrimary: "#ffffff",
  bgSubcat: "#ead04d",
  textOnSubcat: "#000000",
  bgTag: "#000000",
  textTag: "#ffffff",
  bgBody: "#ffffff",
  cardBody: "#ffffff",
  textBody: "#000000",
  title: "#011255",
  navbar: "#000000",
  radius: "10px",
  shadow: "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
};

const DEFAULTS_DARK: CarteTheme = {
  ...DEFAULTS_LIGHT,
  isDark: true,
  primary: "#1a3a8a",
  bgBody: "#0f0f14",
  cardBody: "#1a1a23",
  textBody: "#f5f5f5",
  title: "#ffffff",
};

export function resolveTheme(restaurant: PublicMenu["restaurant"]): CarteTheme {
  const isDark = restaurant.theme === "dark";
  const fallback = isDark ? DEFAULTS_DARK : DEFAULTS_LIGHT;

  return {
    ...fallback,
    primary: restaurant.couleurPrimaire?.trim() || fallback.primary,
    title: restaurant.couleurTexteTitre?.trim() || fallback.title,
    bgSubcat: restaurant.couleurCategorie?.trim() || fallback.bgSubcat,
    bgBody: restaurant.couleurFond?.trim() || fallback.bgBody,
    cardBody: restaurant.couleurSecondaire?.trim() || fallback.cardBody,
  };
}

/**
 * Applique de l'alpha à n'importe quelle couleur CSS (hex, oklch, rgb, hsl, named).
 * - Hex `#RRGGBB` → `#RRGGBBAA`
 * - Tout le reste → `color-mix(in oklab, COLOR PCT%, transparent)`
 */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  const hex = /^#?([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const a = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${hex[1]}${a}`;
  }
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)));
  return `color-mix(in oklab, ${c} ${pct}%, transparent)`;
}
