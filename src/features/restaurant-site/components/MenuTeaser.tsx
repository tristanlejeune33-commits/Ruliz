import Link from "next/link";
import type { MenuTeaserConfig, RestaurantSiteBranding } from "../types";

interface MenuTeaserProps {
  branding: RestaurantSiteBranding;
  config: MenuTeaserConfig;
}

/**
 * Bloc "Voir la carte" — porte d'entrée vers `/carte/[id]`.
 * Visuellement centré sur fond élevé pour bien contraster avec le rest.
 */
export function MenuTeaser({ branding, config }: MenuTeaserProps) {
  const title = config.title || "La carte";
  const subtitle =
    config.subtitle || "Découvrez nos plats, mis à jour régulièrement.";
  const ctaLabel = config.ctaLabel || "Voir la carte complète";

  return (
    <section id="menu" className="rs-section rs-menu-teaser">
      <div className="rs-container">
        <div className="rs-menu-teaser__inner">
          <p className="rs-eyebrow">Au menu</p>
          <h2 className="rs-display rs-menu-teaser__title">{title}</h2>
          <p className="rs-menu-teaser__subtitle">{subtitle}</p>
          <Link
            href={`/carte/${branding.id}`}
            className="rs-btn rs-btn--primary"
            style={{ marginTop: "var(--rs-s-4)" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
