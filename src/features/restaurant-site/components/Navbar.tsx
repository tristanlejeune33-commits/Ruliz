import Link from "next/link";
import type { SupportedLang } from "@/lib/langs";
import type { RestaurantSiteBranding, RestaurantSiteConfig } from "../types";
import { SiteLangSwitcher } from "./SiteLangSwitcher";

interface NavbarProps {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
  currentLang: SupportedLang;
}

/**
 * Barre de nav sticky avec logo + nom resto + liens d'ancrage + CTA carte.
 * Mobile : juste le brand (les liens sont accessibles en scroll naturel).
 */
export function Navbar({ branding, config, currentLang }: NavbarProps) {
  const carteHref = `/carte/${branding.id}`;

  const sections = [];
  if (config.sections.about) sections.push({ href: "#about", label: "À propos" });
  if (config.sections.menuTeaser) sections.push({ href: "#menu", label: "La carte" });
  if (config.sections.gallery) sections.push({ href: "#gallery", label: "Galerie" });
  if (config.sections.practical) sections.push({ href: "#practical", label: "Infos" });
  if (config.sections.reservation) sections.push({ href: "#reservation", label: "Réserver" });

  return (
    <nav className="rs-nav">
      <div className="rs-container">
        <div className="rs-nav__inner">
          <Link href="#top" className="rs-nav__brand">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`Logo ${branding.nom}`}
                className="rs-nav__logo"
              />
            ) : null}
            <span className="rs-nav__name">{branding.nom}</span>
          </Link>

          <ul className="rs-nav__links">
            {sections.map((s) => (
              <li key={s.href}>
                <a href={s.href}>{s.label}</a>
              </li>
            ))}
          </ul>

          <div className="rs-nav__right">
            <SiteLangSwitcher current={currentLang} />
            <Link href={carteHref} className="rs-btn rs-btn--primary rs-nav__cta">
              Voir la carte
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
