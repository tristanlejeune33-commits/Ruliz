import type { PracticalConfig, RestaurantSiteBranding } from "../types";

interface PracticalProps {
  branding: RestaurantSiteBranding;
  config: PracticalConfig;
}

/**
 * Section "Infos pratiques" — adresse, horaires, contact.
 * 3 colonnes responsive ; les éléments vides ne sont pas rendus.
 */
export function Practical({ branding, config }: PracticalProps) {
  const phone = config.phone;
  const email = config.email;
  const schedule = config.schedule;
  const addressLines = [branding.adresse, branding.ville, branding.pays]
    .filter(Boolean)
    .join("\n");
  const mapsUrl =
    config.mapsUrl ||
    (addressLines
      ? `https://www.google.com/maps/search/${encodeURIComponent(addressLines.replace(/\n/g, " "))}`
      : null);

  // Si aucune info à afficher, on cache la section
  if (!phone && !email && !schedule && !addressLines) return null;

  return (
    <section id="practical" className="rs-section">
      <div className="rs-container">
        <div className="rs-section__head">
          <p className="rs-eyebrow">Infos pratiques</p>
          <h2 className="rs-display rs-section__title">Nous trouver</h2>
        </div>

        <div className="rs-practical__grid">
          {addressLines && (
            <div className="rs-practical__block">
              <h3>Adresse</h3>
              <p>{addressLines}</p>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rs-practical__map"
                >
                  Voir sur la carte →
                </a>
              )}
            </div>
          )}

          {schedule && (
            <div className="rs-practical__block">
              <h3>Horaires</h3>
              <p>{schedule}</p>
            </div>
          )}

          {(phone || email) && (
            <div className="rs-practical__block">
              <h3>Contact</h3>
              {phone && (
                <p>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
                </p>
              )}
              {email && (
                <p>
                  <a href={`mailto:${email}`}>{email}</a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
