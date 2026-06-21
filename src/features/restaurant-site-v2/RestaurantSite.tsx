import "./styles.css";
import type { CSSProperties } from "react";
import { About } from "./components/About";
import { Footer } from "./components/Footer";
import { FloatingReserveCTA } from "./components/FloatingReserveCTA";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { LenisProvider } from "./components/LenisProvider";
import { MenuTeaser } from "./components/MenuTeaser";
import { Navbar } from "./components/Navbar";
import { Practical } from "./components/Practical";
import { ReservationStrip } from "./components/ReservationStrip";
import { ScrollProgress } from "./components/ScrollProgress";
import { Testimonials } from "./components/Testimonials";
import { getFontsForPreset } from "./lib/fonts";
import { hexToOklch } from "./lib/hexToOklch";
import type { RestaurantConfig } from "./types";

/**
 * Luminance relative WCAG d'une couleur hex (0 = noir, 1 = blanc).
 * Cf. https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (h.length !== 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Ratio de contraste WCAG entre 2 couleurs hex. 21 = max, 1 = identiques.
 * WCAG AA exige >= 4.5 pour le texte normal, >= 3 pour le large/UI.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Retourne le texte le plus lisible (noir ou blanc) pour un fond donné.
 * Utilisé en fallback ET en override si le contraste user est < 3.
 */
function pickReadableTextColor(hex: string): string {
  const lum = relativeLuminance(hex);
  return lum > 0.5
    ? "oklch(0.18 0.01 80)" // ink dark sur fond clair
    : "oklch(0.985 0.005 85)"; // bg light sur fond sombre
}

interface RestaurantSiteProps {
  config: RestaurantConfig;
}

/**
 * Composant racine du template éditorial-magazine v2.
 *
 * Single prop : un `RestaurantConfig` complet. Rendu :
 *   - Wrapper `.rs2-root` avec data-preset / data-theme / data-accent
 *   - Lenis smooth scroll
 *   - Scroll progress + Floating reserve CTA (chrome)
 *   - 9 sections dans l'ordre (Navbar / Hero / About / Menu / Gallery /
 *     Testimonials / Practical / Reservation / Footer)
 *
 * Numérotation des sections : on commence à 01 pour À propos (Hero =
 * couverture, pas de label) et on incrémente conditionnellement selon
 * les options.show* du config.
 */
export function RestaurantSite({ config }: RestaurantSiteProps) {
  // Résout les fonts pour le preset choisi (preload conditionnel)
  const fonts = getFontsForPreset(config.typographyPreset);

  // Convertit l'accent en oklch si l'utilisateur a fourni du hex
  const accent = hexToOklch(config.accentColor);

  // === Couleurs CTA ===
  // Logique de fallback intelligent avec garantie contraste WCAG :
  //   1. Si user pick bg + text → check contrast ratio
  //      - Si ratio < 3 (sous AA même pour large text) → override le texte
  //        avec une couleur lisible auto-calculée
  //      - Sinon → on prend les 2 tels quels
  //   2. Si user pick bg seul → calcule texte contrastant
  //   3. Si user pick text seul → on garde, bg fallback CSS
  //   4. Rien → CSS fallback (--ink/--bg normal, #fff/--ink banner)
  //
  // Hover : on injecte aussi --rs2-btn-bg-hover et --rs2-btn-text-hover
  // qui REPRENNENT les couleurs (au lieu de switcher en accent).
  const btnBg: string | null = config.buttonBgColor
    ? hexToOklch(config.buttonBgColor)
    : null;
  let btnText: string | null = config.buttonTextColor
    ? hexToOklch(config.buttonTextColor)
    : null;

  // === Garantie contraste ===
  // Si les 2 sont set par l'user mais contraste < 3 (illisibilité critique),
  // on garde le bg choisi et on FORCE un texte contrastant. C'est la
  // règle de sauvegarde anti-bug : impossible de finir avec un bouton
  // texte invisible.
  if (
    config.buttonBgColor &&
    config.buttonTextColor &&
    contrastRatio(config.buttonBgColor, config.buttonTextColor) < 3
  ) {
    btnText = pickReadableTextColor(config.buttonBgColor);
  }
  // Si bg set mais text vide → auto-calcule
  if (btnBg && !btnText && config.buttonBgColor) {
    btnText = pickReadableTextColor(config.buttonBgColor);
  }

  const styleVars: CSSProperties = {
    ...fonts.style,
    // @ts-expect-error CSS custom properties non typées dans React.CSSProperties
    "--accent": accent,
    // Custom button colors si définies
    ...(btnBg ? { "--rs2-btn-bg": btnBg } : {}),
    ...(btnText ? { "--rs2-btn-text": btnText } : {}),
    // Hover : reprend les mêmes couleurs custom (évite le flash accent)
    ...(btnBg ? { "--rs2-btn-bg-hover": btnBg } : {}),
    ...(btnText ? { "--rs2-btn-text-hover": btnText } : {}),
  };

  // Numérotation dynamique des sections — labels visuels
  let n = 0;
  const aboutNum = ++n;
  const menuNum = ++n;
  const galleryNum = config.options.showGallery ? ++n : 0;
  const testimonialsNum =
    config.options.showTestimonials && (config.testimonials?.length ?? 0) > 0
      ? ++n
      : 0;
  const practicalNum = ++n;

  return (
    <div
      className={`rs2-root ${fonts.className}`}
      data-preset={config.typographyPreset}
      data-theme={config.options.theme}
      style={styleVars}
    >
      <LenisProvider />
      <ScrollProgress />

      <Navbar config={config} />

      <Hero config={config} />

      <About config={config} sectionNum={aboutNum} />

      <MenuTeaser config={config} sectionNum={menuNum} />

      {galleryNum > 0 && <Gallery config={config} sectionNum={galleryNum} />}

      {testimonialsNum > 0 && (
        <Testimonials config={config} sectionNum={testimonialsNum} />
      )}

      <Practical config={config} sectionNum={practicalNum} />

      {config.options.showReservation && config.reservationUrl && (
        <ReservationStrip config={config} />
      )}

      <Footer config={config} />

      <FloatingReserveCTA reservationUrl={config.reservationUrl} />
    </div>
  );
}
