import "./styles/site.css";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { MenuTeaser } from "./components/MenuTeaser";
import { Gallery } from "./components/Gallery";
import { Testimonials } from "./components/Testimonials";
import { Practical } from "./components/Practical";
import { ReservationStrip } from "./components/ReservationStrip";
import { Footer } from "./components/Footer";
import { Team } from "./components/Team";
import { Faq } from "./components/Faq";
import { GoogleReviews } from "./components/GoogleReviews";
import type { SupportedLang } from "@/lib/langs";
import type { RestaurantSiteBranding, RestaurantSiteConfig } from "./types";

interface RestaurantSiteProps {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
  /** Lang du contenu rendu — utilisée par le switcher et l'attribut lang HTML. */
  currentLang?: SupportedLang;
}

/**
 * Composant racine du mini-site restaurateur.
 *
 * Reçoit :
 *  - `branding`   : champs du Restaurant (nom, palette, social, …)
 *  - `config`     : structure JSON éditable depuis `/dashboard/site`
 *
 * Injecte les CSS variables `--rs-accent`, `--rs-bg`, etc. sur le wrapper
 * pour que toutes les sections héritent automatiquement de la palette
 * sans avoir à passer les couleurs en prop à chaque enfant.
 */
export function RestaurantSite({
  branding,
  config,
  currentLang = "fr",
}: RestaurantSiteProps) {
  // Résolution des couleurs avec override config > resto > fallback
  const accent =
    config.style?.accentColor ||
    branding.couleurPrimaire ||
    "#b58f4a";

  const bg =
    branding.couleurFond ||
    (branding.theme === "dark" ? "#0e0e10" : "#fbfaf7");

  // Contraste du texte sur le bouton accent — heuristique simple :
  // si la couleur d'accent est claire on met du texte foncé, sinon blanc.
  const accentContrast = pickReadableTextColor(accent);

  // fontStyle resto → tokens display
  const fontStyle = branding.fontStyle ?? "editorial";

  const themeAttr = branding.theme ?? "light";

  // Style inline qui définit les variables CSS — surcharge celles du
  // `.rs-site` dans site.css.
  const styleVars: React.CSSProperties = {
    // @ts-expect-error — CSS custom properties non typées dans CSSProperties
    "--rs-accent": accent,
    "--rs-accent-contrast": accentContrast,
    "--rs-bg": bg,
    // Si theme dark, on bascule aussi text/border via les selectors data-theme
  };

  return (
    <div
      className="rs-site"
      data-theme={themeAttr}
      data-font={fontStyle}
      lang={currentLang}
      style={styleVars}
    >
      <Navbar branding={branding} config={config} currentLang={currentLang} />

      <Hero branding={branding} config={config} />

      {config.sections.about && config.about && (
        <About config={config.about} />
      )}

      {config.sections.menuTeaser && (
        <MenuTeaser branding={branding} config={config.menuTeaser ?? {}} />
      )}

      {config.sections.gallery && (config.gallery?.length ?? 0) > 0 && (
        <Gallery items={config.gallery ?? []} />
      )}

      {config.sections.team && (config.team?.length ?? 0) > 0 && (
        <Team members={config.team ?? []} />
      )}

      {config.sections.testimonials && (config.testimonials?.length ?? 0) > 0 && (
        <Testimonials items={config.testimonials ?? []} />
      )}

      {config.sections.googleReviews && (
        <GoogleReviews
          branding={branding}
          config={config.googleReviews ?? {}}
        />
      )}

      {config.sections.faq && (config.faq?.length ?? 0) > 0 && (
        <Faq items={config.faq ?? []} />
      )}

      {config.sections.practical && (
        <Practical branding={branding} config={config.practical ?? {}} />
      )}

      {config.sections.reservation && config.reservation && (
        <ReservationStrip config={config.reservation} />
      )}

      <Footer branding={branding} config={config} />
    </div>
  );
}

/**
 * Détermine si on doit afficher du texte noir ou blanc sur un fond donné,
 * via le calcul WCAG simplifié de la luminance relative.
 *
 * Compatible #RGB et #RRGGBB. Si format invalide → fallback blanc.
 */
function pickReadableTextColor(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Luminance relative
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#1a1a1a" : "#ffffff";
}
