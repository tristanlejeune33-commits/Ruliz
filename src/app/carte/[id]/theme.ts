import type { PublicMenu } from "@/server/public/menu";

/**
 * Résout les couleurs et la typo d'une carte publique en partant des champs
 * configurés par le restaurateur, avec des défauts élégants si null.
 */
export interface CarteTheme {
  isDark: boolean;
  accent: string;
  bg: string;
  bgElevated: string;
  text: string;
  textMuted: string;
  textTitre: string;
  textCategorie: string;
  border: string;
  fontDisplay: string;
}

const DEFAULTS_LIGHT = {
  bg: "oklch(0.99 0.005 80)", // creme tres pale
  bgElevated: "#ffffff",
  text: "oklch(0.18 0.02 50)",
  textMuted: "oklch(0.5 0.01 50)",
  textTitre: "oklch(0.15 0.03 30)",
  textCategorie: "oklch(0.25 0.02 30)",
  border: "oklch(0.92 0.01 60)",
};

const DEFAULTS_DARK = {
  bg: "oklch(0.16 0.02 30)",
  bgElevated: "oklch(0.21 0.02 30)",
  text: "oklch(0.95 0.005 60)",
  textMuted: "oklch(0.65 0.01 60)",
  textTitre: "oklch(0.97 0.02 70)",
  textCategorie: "oklch(0.85 0.02 60)",
  border: "oklch(0.28 0.02 30)",
};

const FONT_BY_STYLE: Record<"modern" | "editorial" | "elegant", string> = {
  modern:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  editorial: "var(--font-display-editorial), ui-serif, Georgia, serif",
  elegant: "var(--font-display-elegant), ui-serif, Georgia, serif",
};

export function resolveTheme(restaurant: PublicMenu["restaurant"]): CarteTheme {
  const isDark = restaurant.theme === "dark";
  const fallback = isDark ? DEFAULTS_DARK : DEFAULTS_LIGHT;
  const accent = restaurant.couleurPrimaire?.trim() || "#4870e0";

  return {
    isDark,
    accent,
    bg: restaurant.couleurFond?.trim() || fallback.bg,
    bgElevated: fallback.bgElevated,
    text: fallback.text,
    textMuted: fallback.textMuted,
    textTitre: restaurant.couleurTexteTitre?.trim() || fallback.textTitre,
    textCategorie: restaurant.couleurCategorie?.trim() || fallback.textCategorie,
    border: fallback.border,
    fontDisplay: FONT_BY_STYLE[restaurant.fontStyle],
  };
}

/** Convertit un hex #RRGGBB en variante avec alpha (#RRGGBBAA). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${m[1]}${a}`;
}
