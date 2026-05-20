import Link from "next/link";
import type { RestaurantSiteBranding, RestaurantSiteConfig } from "../types";

interface FooterProps {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
}

/**
 * Footer — brand + about court + 2 colonnes liens (nav + social) + mentions.
 */
export function Footer({ branding, config }: FooterProps) {
  const year = new Date().getFullYear();
  const carteHref = `/carte/${branding.id}`;
  const socials = [
    branding.facebookUrl && { label: "Facebook", url: branding.facebookUrl },
    branding.instagramUrl && { label: "Instagram", url: branding.instagramUrl },
    branding.tiktokUrl && { label: "TikTok", url: branding.tiktokUrl },
    branding.googleReviewUrl && { label: "Avis Google", url: branding.googleReviewUrl },
  ].filter((s): s is { label: string; url: string } => Boolean(s));

  const navItems: Array<{ href: string; label: string }> = [];
  if (config.sections.about) navItems.push({ href: "#about", label: "À propos" });
  navItems.push({ href: carteHref, label: "La carte" });
  if (config.sections.gallery) navItems.push({ href: "#gallery", label: "Galerie" });
  if (config.sections.practical) navItems.push({ href: "#practical", label: "Infos pratiques" });
  if (config.sections.reservation) navItems.push({ href: "#reservation", label: "Réserver" });

  return (
    <footer className="rs-footer">
      <div className="rs-container">
        <div className="rs-footer__grid">
          <div>
            <p className="rs-footer__brand">{branding.nom}</p>
            {branding.description && (
              <p className="rs-footer__about">{branding.description}</p>
            )}
          </div>

          <div>
            <p className="rs-footer__title">Navigation</p>
            <ul className="rs-footer__links">
              {navItems.map((item) =>
                item.href.startsWith("/") ? (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ) : (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ),
              )}
            </ul>
          </div>

          {socials.length > 0 && (
            <div>
              <p className="rs-footer__title">Suivez-nous</p>
              <ul className="rs-footer__links">
                {socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rs-footer__bottom">
          <span>
            © {year} {branding.nom}. Tous droits réservés.
          </span>
          <span>
            Propulsé par{" "}
            <a
              href="https://ruliz-panel.fr"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ruliz
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
