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

  const styleVars: CSSProperties = {
    ...fonts.style,
    // @ts-expect-error CSS custom properties non typées dans React.CSSProperties
    "--accent": accent,
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
