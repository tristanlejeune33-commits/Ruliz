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
 * Calcule la luminance perceptuelle d'une couleur hex et retourne
 * la couleur de texte la plus lisible (oklch noir ou blanc).
 *
 * Utilisé en fallback quand l'utilisateur a customisé buttonBgColor
 * sans préciser buttonTextColor. Évite le texte invisible.
 *
 * Référence WCAG simplifiée : luminance > 0.55 → texte sombre, sinon clair.
 */
function pickReadableTextColor(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (h.length !== 6) return "oklch(0.985 0.005 85)"; // fallback blanc
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55
    ? "oklch(0.18 0.01 80)" // ink dark
    : "oklch(0.985 0.005 85)"; // bg light
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
  // Logique de fallback intelligent :
  //   - Si user pick bg + text → on prend les deux tels quels
  //   - Si user pick bg seul → on calcule auto un texte contrastant
  //     (luminance WCAG simplifiée) pour éviter le texte invisible
  //   - Si user pick text seul → on prend ink par défaut (cohérent
  //     avec le contexte light theme)
  //   - Si rien → CSS fallback (--ink/--bg en normal, #fff/--ink banner)
  //
  // Hover : on injecte aussi --rs2-btn-bg-hover et --rs2-btn-text-hover
  // qui REPRENNENT les couleurs custom (au lieu de switcher en accent).
  // Sinon le bouton flashe en accent au hover et peut devenir invisible
  // si l'accent est sombre.
  const btnBg = config.buttonBgColor ? hexToOklch(config.buttonBgColor) : null;
  let btnText: string | null = config.buttonTextColor
    ? hexToOklch(config.buttonTextColor)
    : null;

  // Auto-contrast : bg set mais text vide → calcule un texte lisible
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
