import Link from "next/link";
import type { RestaurantConfig } from "../types";

interface FooterProps {
  config: RestaurantConfig;
}

/**
 * Footer 4 colonnes éditorial.
 *
 * Brand (nom display + tagline + meta city) / Navigation / Contact /
 * Réseaux sociaux. Mention "Propulsé par Ruliz" en bas à droite.
 */
export function Footer({ config }: FooterProps) {
  const year = new Date().getFullYear();
  const socials: Array<{ label: string; url: string }> = [];
  if (config.socials.instagram) {
    const handle = config.socials.instagram.replace(/^@/, "");
    socials.push({
      label: "Instagram",
      url: `https://instagram.com/${handle}`,
    });
  }
  if (config.socials.facebook) {
    socials.push({
      label: "Facebook",
      url: `https://facebook.com/${config.socials.facebook}`,
    });
  }
  if (config.socials.tiktok) {
    const handle = config.socials.tiktok.replace(/^@/, "");
    socials.push({
      label: "TikTok",
      url: `https://tiktok.com/@${handle}`,
    });
  }

  return (
    <footer className="rs2-footer">
      <div className="rs2-container">
        <div className="rs2-footer-grid">
          <div className="rs2-footer-brand">
            <h3 className="rs2-display" data-no-translate>
              {config.restaurantName}
            </h3>
            <p>{config.tagline}</p>
            <p style={{ marginTop: 12, fontSize: 13 }}>
              {config.city} · Depuis {config.established}
            </p>
          </div>

          <div className="rs2-footer-col">
            <h4>Navigation</h4>
            <ul>
              <li>
                <Link href={config.menuUrl} className="rs2-link">
                  La carte
                </Link>
              </li>
              <li>
                <a href="#about" className="rs2-link">
                  À propos
                </a>
              </li>
              {config.options.showGallery && (
                <li>
                  <a href="#gallery" className="rs2-link">
                    Galerie
                  </a>
                </li>
              )}
              <li>
                <a href="#practical" className="rs2-link">
                  Contact
                </a>
              </li>
              {config.options.showReservation && config.reservationUrl && (
                <li>
                  <a href="#book" className="rs2-link">
                    Réserver
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="rs2-footer-col">
            <h4>Contact</h4>
            <ul>
              <li>{config.practical.address}</li>
              <li>
                <a
                  href={`tel:${config.practical.phone.replace(/\s+/g, "")}`}
                  className="rs2-link"
                >
                  {config.practical.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${config.practical.email}`} className="rs2-link">
                  {config.practical.email}
                </a>
              </li>
            </ul>
          </div>

          <div className="rs2-footer-col">
            <h4>Réseaux</h4>
            <ul>
              {socials.length === 0 && (
                <li style={{ color: "var(--muted)" }}>—</li>
              )}
              {socials.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rs2-link"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rs2-footer-bottom">
          <span data-no-translate>
            © {year} {config.restaurantName}
          </span>
          <a
            href="https://ruliz-panel.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="rs2-link"
          >
            Propulsé par Ruliz
          </a>
        </div>
      </div>
    </footer>
  );
}
