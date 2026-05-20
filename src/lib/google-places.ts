/**
 * Wrapper minimal autour de Google Places API (legacy "Place Search" +
 * "Place Details").
 *
 * Pourquoi pas la nouvelle "Places API (New)" :
 *   - L'ancienne est encore officiellement supportée et amplement suffisante
 *   - $200/mois de crédit gratuit Google Cloud couvre largement notre usage
 *     (50 restos × refresh hebdo = ~200 calls/mois ≈ $0.034 → free)
 *   - Endpoints stables, doc en ligne mature
 *
 * Limites Google :
 *   - Place Details ne renvoie QUE 5 reviews (les plus pertinents ou récents
 *     selon `reviews_sort`)
 *   - ToS interdit le cache >30 jours → refresh hebdo OK
 *   - Reviews translation : `reviews_no_translations=true` pour garder
 *     l'original (sinon Google traduit déjà en fr)
 */

export interface GoogleReview {
  /** Nom de l'auteur — ex: "Marie L." */
  author_name: string;
  /** URL Google de l'auteur (optionnel). */
  author_url?: string;
  /** Note de 1 à 5. */
  rating: number;
  /** Texte de l'avis — peut être vide. */
  text: string;
  /** Description relative ex: "il y a 2 mois". Toujours en EN par défaut,
   * traduisible via `language=fr` dans la query. */
  relative_time_description: string;
  /** Unix timestamp en secondes. */
  time: number;
  /** Photo de profil de l'auteur. */
  profile_photo_url?: string;
  /** ISO 639-1 du texte original (avant translation Google). */
  language?: string;
  /** Si Google a traduit, ici c'est la lang d'origine. */
  original_language?: string;
}

export interface GooglePlaceDetails {
  /** place_id Google. */
  place_id: string;
  /** Note moyenne (0-5). */
  rating: number | null;
  /** Nombre total d'avis. */
  user_ratings_total: number | null;
  /** Reviews retournés (max 5). */
  reviews: GoogleReview[];
  /** Nom de l'établissement tel que connu de Google. */
  name?: string;
  /** Adresse formattée. */
  formatted_address?: string;
  /** URL Google Maps de la fiche. */
  url?: string;
}

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

function getApiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY || null;
}

/**
 * Trouve le `place_id` Google d'un resto à partir de son nom + adresse.
 *
 * On utilise "Find Place from Text" plutôt que "Text Search" :
 *   - Find Place est moins cher ($17/1000 vs $32/1000 pour Text Search)
 *   - On veut un seul candidat le plus probable, pas une liste
 *
 * @returns null si Google ne trouve rien (à ne pas confondre avec une
 *          erreur API qui throw).
 */
export async function findPlaceId(
  query: string,
): Promise<string | null> {
  const key = getApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY non défini");
  }
  const url =
    `${PLACES_BASE}/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery` +
    `&fields=place_id,name,formatted_address` +
    `&key=${key}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Google Find Place HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    candidates?: Array<{ place_id: string }>;
    error_message?: string;
  };

  if (json.status === "ZERO_RESULTS") return null;
  if (json.status !== "OK") {
    throw new Error(
      `Google Find Place API error: ${json.status} ${json.error_message ?? ""}`,
    );
  }
  return json.candidates?.[0]?.place_id ?? null;
}

/**
 * Récupère les détails d'un place_id : rating, count, reviews.
 *
 * Champs demandés (pour minimiser le coût — chaque "Field" ajouté augmente
 * le tarif) :
 *   - rating + user_ratings_total : 0 coût supplémentaire (Basic Data)
 *   - reviews : c'est le "Reviews" field group (= $17/1000 contre $5 pour
 *     juste les Basic Data, mais on a $200 gratuit donc on prend)
 */
export async function fetchPlaceDetails(
  placeId: string,
  options: { lang?: string } = {},
): Promise<GooglePlaceDetails | null> {
  const key = getApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY non défini");
  }

  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "rating",
    "user_ratings_total",
    "reviews",
    "url",
  ].join(",");

  const url =
    `${PLACES_BASE}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${fields}` +
    `&reviews_no_translations=true` + // garde le texte d'origine
    `&reviews_sort=most_relevant` +
    `&language=${options.lang ?? "fr"}` +
    `&key=${key}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Google Place Details HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    result?: GooglePlaceDetails;
    error_message?: string;
  };

  if (json.status === "NOT_FOUND" || json.status === "ZERO_RESULTS") {
    return null;
  }
  if (json.status !== "OK") {
    throw new Error(
      `Google Place Details API error: ${json.status} ${json.error_message ?? ""}`,
    );
  }
  if (!json.result) return null;

  // Normalise : si reviews absent, mets array vide
  return {
    place_id: placeId,
    name: json.result.name,
    formatted_address: json.result.formatted_address,
    rating: json.result.rating ?? null,
    user_ratings_total: json.result.user_ratings_total ?? null,
    reviews: Array.isArray(json.result.reviews) ? json.result.reviews : [],
    url: json.result.url,
  };
}

/**
 * Filtre les reviews selon les options du resto (5★ only, min rating, etc.).
 */
export function filterReviews(
  reviews: GoogleReview[],
  options: { fiveStarsOnly?: boolean; minRating?: number } = {},
): GoogleReview[] {
  let out = reviews;
  if (options.fiveStarsOnly) {
    out = out.filter((r) => r.rating === 5);
  } else if (typeof options.minRating === "number") {
    out = out.filter((r) => r.rating >= (options.minRating ?? 0));
  }
  return out;
}
