"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Btn } from "./primitives/Btn";
import { Monogram } from "./primitives/Monogram";
import type { RestaurantConfig } from "../types";

interface NavbarProps {
  config: RestaurantConfig;
}

/**
 * Navbar sticky transparent → solid au scroll (80px threshold).
 *
 * Logo : <img src={logoUrl}> avec filter:invert quand le fond est
 * "sombre" depuis le point de vue du logo (= théoriquement quand
 * heroLayout === 'banner' && !solid). En light theme avec navbar solide,
 * on retire le filter pour rendre le logo dans sa couleur originale.
 *
 * Sur mobile, les liens disparaissent (CSS media), on garde brand + CTA.
 */
export function Navbar({ config }: NavbarProps) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    function onScroll() {
      setSolid(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Le filter invert s'applique quand on est sur un hero banner avec
  // overlay sombre ET pas encore en mode solid (= on voit l'overlay)
  const shouldInvert =
    config.options.heroLayout === "banner" &&
    config.options.theme === "light" &&
    !solid;

  return (
    <nav className={`rs2-nav${solid ? " solid" : ""}`}>
      <div className="rs2-container">
        <div className="rs2-nav-inner">
          <Link href="#top" className="rs2-nav-brand" aria-label={config.restaurantName}>
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.restaurantName}
                className={`rs2-nav-logo${shouldInvert ? " invert" : ""}`}
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
                variant={solid ? "primary" : "secondary"}
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
