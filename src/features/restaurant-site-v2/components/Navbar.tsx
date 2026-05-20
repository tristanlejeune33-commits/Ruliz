"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Btn } from "./primitives/Btn";
import { Monogram } from "./primitives/Monogram";
import type { RestaurantConfig } from "../types";

interface NavbarProps {
  config: RestaurantConfig;
}

/**
 * Navbar sticky TOUJOURS SOLIDE (background blanc cassé + filet bas).
 *
 * Décision design : on retire l'état transparent au-dessus du hero. Une
 * navbar blanche permanente :
 *   - Améliore la lisibilité (les liens sont toujours sur fond lisible)
 *   - Évite le "saut" visuel quand on scroll
 *   - Met en valeur le CTA Réserver qui est toujours visible/cliquable
 *
 * Le logo n'est plus jamais inversé (le filter:invert n'avait de sens que
 * sur fond hero sombre transparent).
 *
 * Le CTA Réserver est toujours `primary` avec une flèche cohérente avec
 * le reste du template (translate-x au hover).
 */
export function Navbar({ config }: NavbarProps) {
  return (
    <nav className="rs2-nav solid">
      <div className="rs2-container">
        <div className="rs2-nav-inner">
          <Link
            href="#top"
            className="rs2-nav-brand"
            aria-label={config.restaurantName}
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.restaurantName}
                className="rs2-nav-logo"
              />
            ) : (
              <Monogram name={config.restaurantName} />
            )}
            <span>{config.restaurantName}</span>
          </Link>

          <div className="rs2-nav-links">
            <Link href={config.menuUrl} className="rs2-link">
              Carte
            </Link>
            <a href="#about" className="rs2-link">
              À propos
            </a>
            {config.options.showGallery && (
              <a href="#gallery" className="rs2-link">
                Galerie
              </a>
            )}
            <a href="#practical" className="rs2-link">
              Contact
            </a>
          </div>

          <div className="rs2-nav-cta">
            {config.reservationUrl && (
              <Btn
                href={config.reservationUrl}
                external
                variant="primary"
                arrow
              >
                Réserver
              </Btn>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
