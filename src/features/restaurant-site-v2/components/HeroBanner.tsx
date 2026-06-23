/* eslint-disable @next/next/no-img-element */

import type { RestaurantConfig } from "../types";
import { Btn } from "./primitives/Btn";
import { Photo } from "./primitives/Photo";

interface HeroBannerProps {
  config: RestaurantConfig;
}

/**
 * Hero banner full-bleed.
 *
 * - Image en absolute fill, Ken Burns 22s
 * - Voile gradient noir bas → faible haut
 * - Contenu en bas (.hero-banner-inner) : meta + (logo wordmark OU titre
 *   géant blanc) + tagline + 2 CTAs
 *
 * Le logo en bas est sur fond sombre donc on l'affiche tel quel — le
 * filter:invert ne s'applique PAS ici (c'est seulement pour la navbar
 * où le contexte change au scroll).
 */
export function HeroBanner({ config }: HeroBannerProps) {
  const photoSrc = config.bannerUrl ?? config.heroImage ?? "";

  return (
    <section id="top" className="rs2-hero-banner">
      <div className="rs2-hero-banner-photo">
        {photoSrc && (
          <Photo src={photoSrc} alt={config.restaurantName} priority />
        )}
      </div>
      <div className="rs2-hero-banner-veil" aria-hidden />

      <div className="rs2-container rs2-hero-banner-inner">
        <div className="rs2-hero-banner-meta">
          <span className="rs2-eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>
            {config.city} · Depuis {config.established}
          </span>
          <span className="dot" aria-hidden />
          <span className="rs2-eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>
            Restaurant
          </span>
        </div>

        <div className="rs2-hero-banner-mark">
          {config.logoUrl ? (
            <div
              className="rs2-hero-banner-logo-circle"
              aria-label={config.restaurantName}
            >
              <img
                src={config.logoUrl}
                alt={config.restaurantName}
                className="rs2-hero-banner-logo"
              />
            </div>
          ) : (
            <h1 className="rs2-display rs2-hero-banner-title" data-no-translate>
              {config.restaurantName}
            </h1>
          )}
        </div>

        <p className="rs2-hero-banner-tagline">{config.tagline}</p>

        <div className="rs2-hero-banner-ctas">
          <Btn href={config.menuUrl} variant="primary" arrow>
            Voir la carte
          </Btn>
          {config.reservationUrl && (
            <Btn
              href={config.reservationUrl}
              external
              variant="primary"
              arrow
            >
              Réserver une table
            </Btn>
          )}
        </div>
      </div>
    </section>
  );
}
