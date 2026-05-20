import type { PracticalConfig, RestaurantSiteBranding } from "../types";

interface PracticalProps {
  branding: RestaurantSiteBranding;
  /**
   * Override optionnel — si défini, prime sur les valeurs du resto.
   * Sinon on tire 100% des infos depuis le restaurant (telephone, email,
   * adresse, horairesOuverture, socials). Le restaurateur edite ces infos
   * dans /dashboard/restaurant.
   */
  config: PracticalConfig;
}

/**
 * Section "Infos pratiques" — adresse + horaires + contact + socials.
 *
 * STRATÉGIE DE SYNC :
 * Toutes les infos sont auto-pullées du `restaurants` table via le `branding`.
 * Le restaurateur n'a PAS à les saisir 2 fois (une fois dans Mon restaurant
 * et une fois ici). Si on veut un override différent pour le site, on peut
 * passer une valeur dans `config` qui prime.
 *
 * Auto-génération mapsUrl : si pas d'URL explicite et qu'on a une adresse →
 * lien Google Maps "search by address" qui fonctionne en France et partout.
 */
export function Practical({ branding, config }: PracticalProps) {
  // Phone/email/schedule : config > resto. Permet override site-only si besoin.
  const phone = config.phone || branding.telephone || null;
  const email = config.email || branding.email || null;
  const schedule = config.schedule || branding.horairesOuverture || null;

  // Adresse multi-lignes (rue + CP + ville + pays)
  const addressLines = [
    branding.adresse,
    [branding.codePostal, branding.ville].filter(Boolean).join(" "),
    branding.pays,
  ]
    .filter(Boolean)
    .join("\n");

  // mapsUrl : config override OU auto-gen depuis l'adresse OU null
  const mapsUrl =
    config.mapsUrl ||
    (addressLines
      ? `https://www.google.com/maps/search/${encodeURIComponent(
          addressLines.replace(/\n/g, " "),
        )}`
      : null);

  // Socials block — depuis branding (pas d'override site-only)
  const socials: Array<{ label: string; url: string; icon: string }> = [];
  if (branding.facebookUrl) {
    socials.push({ label: "Facebook", url: branding.facebookUrl, icon: "facebook" });
  }
  if (branding.instagramUrl) {
    socials.push({
      label: "Instagram",
      url: branding.instagramUrl,
      icon: "instagram",
    });
  }
  if (branding.tiktokUrl) {
    socials.push({ label: "TikTok", url: branding.tiktokUrl, icon: "tiktok" });
  }
  if (branding.googleReviewUrl) {
    socials.push({
      label: "Avis Google",
      url: branding.googleReviewUrl,
      icon: "google",
    });
  }
  if (branding.siteWeb) {
    socials.push({ label: "Site web", url: branding.siteWeb, icon: "globe" });
  }

  // Si rien à afficher, on cache complètement la section
  if (!phone && !email && !schedule && !addressLines && socials.length === 0) {
    return null;
  }

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

        {/* Socials — affiché en bas, plein largeur, séparé visuellement */}
        {socials.length > 0 && (
          <div className="rs-practical__socials">
            <p className="rs-eyebrow">Suivez-nous</p>
            <ul className="rs-practical__socials-list">
              {socials.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="rs-practical__social-link"
                  >
                    <SocialIcon name={s.icon} />
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * SVG icons inlines — pas de lib externe pour les 5 réseaux qu'on supporte.
 * Plus léger qu'un import lucide-react pour rester simple sur le site public.
 */
function SocialIcon({ name }: { name: string }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "facebook":
      return (
        <svg {...props}>
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...props}>
          <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.42-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.42C8.42 2.2 8.8 2.2 12 2.2zm0 2c-3.14 0-3.5.01-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 0 0-.82-1.26 3.4 3.4 0 0 0-1.26-.82c-.39-.15-.97-.33-2.04-.38C15.5 4.21 15.14 4.2 12 4.2zm0 3.4a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zm0 2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.6-2.6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.04.86.13V9.4a6.34 6.34 0 0 0-1-.08A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V9.7a8.16 8.16 0 0 0 4.77 1.52V7.7a4.85 4.85 0 0 1-1.04-1.01z" />
        </svg>
      );
    case "google":
      return (
        <svg {...props}>
          <path d="M21.35 11.1H12v3.3h5.35c-.23 1.95-1.97 5.6-5.35 5.6a6.06 6.06 0 0 1 0-12.1c1.74 0 2.9.75 3.55 1.4l2.4-2.32A9.74 9.74 0 0 0 12 2.5a9.5 9.5 0 1 0 0 19c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.15-1.63z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...props}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 0 1-7.93-7H6c.16 1.99.71 3.86 1.5 5.5A8 8 0 0 1 4.07 11H6c.13-1.97.69-3.83 1.5-5.5A8 8 0 0 1 12 4c.94 0 1.83.16 2.66.45A12.4 12.4 0 0 1 16 11h4.07A8 8 0 0 1 12 20zm6-9h-3.9a14.4 14.4 0 0 0-1.4-5.4A8 8 0 0 1 18 11zm-6.99-6.95A14.4 14.4 0 0 0 9.6 11H6.1a8 8 0 0 1 4.91-6.95z" />
        </svg>
      );
    default:
      return null;
  }
}
