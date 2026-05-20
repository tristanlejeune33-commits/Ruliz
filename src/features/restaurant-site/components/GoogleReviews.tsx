import type {
  GoogleReviewData,
  GoogleReviewsConfig,
  RestaurantSiteBranding,
} from "../types";

interface GoogleReviewsProps {
  branding: RestaurantSiteBranding;
  config: GoogleReviewsConfig;
}

/**
 * Section "Avis Google" — pull auto via Places API.
 *
 * Affichage :
 *  - Note moyenne globale (étoiles + chiffre)
 *  - Nombre total d'avis Google
 *  - Jusqu'à 5 cartes d'avis (filtrables 5★ via config)
 *  - Lien "Voir tous les avis sur Google" → googleReviewUrl du resto
 *  - Badge "Avis vérifiés Google" (gage de crédibilité)
 *
 * Conditions de rendu :
 *  - Aucun avis cached → ne rend pas (le restaurateur doit cliquer
 *    "Rafraîchir" dans /dashboard/site)
 *  - Note < seuil `showOnlyIfRatingAbove` → ne rend pas (évite de
 *    montrer une mauvaise réputation)
 *  - fiveStarsOnly + aucun 5★ parmi les 5 fetched → on rend quand même
 *    la note globale + le lien Google (mais zéro card individuelle)
 */
export function GoogleReviews({ branding, config }: GoogleReviewsProps) {
  const rating = branding.googleRating;
  const total = branding.googleReviewsCount;
  const allReviews = branding.googleReviews;

  // Pas de données du tout → section masquée (rien à montrer)
  if (rating === null || allReviews.length === 0) {
    return null;
  }

  // Seuil note globale
  if (
    typeof config.showOnlyIfRatingAbove === "number" &&
    rating < config.showOnlyIfRatingAbove
  ) {
    return null;
  }

  // Filtre 5★ si demandé
  const displayedReviews = config.fiveStarsOnly
    ? allReviews.filter((r) => r.rating === 5)
    : allReviews;

  return (
    <section id="google-reviews" className="rs-section rs-google">
      <div className="rs-container">
        <div className="rs-google__header">
          <p className="rs-eyebrow">Avis vérifiés Google</p>
          <div className="rs-google__rating-row">
            <Stars value={rating} />
            <span className="rs-google__rating-num">{rating.toFixed(1)}</span>
            {typeof total === "number" && (
              <span className="rs-google__rating-count">
                · {total.toLocaleString("fr-FR")} avis
              </span>
            )}
          </div>
          {config.fiveStarsOnly && (
            <p className="rs-google__filter-note">
              ★★★★★ Avis 5 étoiles uniquement
            </p>
          )}
        </div>

        {displayedReviews.length > 0 && (
          <div className="rs-google__grid">
            {displayedReviews.map((r) => (
              <ReviewCard key={`${r.author_name}-${r.time}`} review={r} />
            ))}
          </div>
        )}

        {branding.googleReviewUrl && (
          <div className="rs-google__cta">
            <a
              href={branding.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rs-btn rs-btn--ghost"
            >
              {typeof total === "number" && total > displayedReviews.length
                ? `Voir les ${total.toLocaleString("fr-FR")} avis sur Google →`
                : "Voir sur Google →"}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Rendu des étoiles (jaunes pleines + grises vides) basé sur une note 0-5.
 * On utilise des caractères Unicode pour éviter d'avoir à ship des SVG.
 */
function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="rs-google__stars" aria-label={`${value} sur 5`}>
      {"★".repeat(full)}
      {half && "⯨"}
      {"☆".repeat(empty)}
    </span>
  );
}

function ReviewCard({ review }: { review: GoogleReviewData }) {
  // Tronque le texte à ~300 chars pour garder les cartes homogènes
  const text =
    review.text.length > 300 ? review.text.slice(0, 297) + "…" : review.text;

  return (
    <article className="rs-google__card">
      <header className="rs-google__card-head">
        {review.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.profile_photo_url}
            alt={review.author_name}
            className="rs-google__card-avatar"
            loading="lazy"
          />
        ) : (
          <div className="rs-google__card-avatar rs-google__card-avatar--fallback">
            {review.author_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="rs-google__card-author">
          <p className="rs-google__card-name">{review.author_name}</p>
          <p className="rs-google__card-meta">
            <Stars value={review.rating} />
            <span>{review.relative_time_description}</span>
          </p>
        </div>
      </header>
      {text && <p className="rs-google__card-text">« {text} »</p>}
    </article>
  );
}
