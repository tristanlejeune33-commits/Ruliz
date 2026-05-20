import "server-only";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import {
  fetchPlaceDetails,
  findPlaceId,
  type GoogleReview,
} from "@/lib/google-places";

/**
 * Rafraîchit les avis Google d'un restaurant.
 *
 * Flow :
 *   1. Si `google_place_id` est null → trouve-le via Find Place API
 *      (à partir de "nom + adresse + ville") et le cache permanent
 *   2. Fetch Place Details (5 reviews + rating + count)
 *   3. Sauvegarde en DB : google_rating, google_reviews_count,
 *      google_reviews_json, google_reviews_refreshed_at
 *
 * Idempotent : peut être rappelé à volonté. Si l'API plante, on log
 * mais on n'écrit rien (l'ancien cache reste valable).
 *
 * Respecte le ToS Google : on refresh max 1× par jour pour éviter de
 * dépasser le crédit gratuit. Cron Inngest hebdo est l'usage normal.
 */
export async function refreshRestaurantGoogleReviews(
  restaurantId: bigint,
): Promise<
  | {
      ok: true;
      rating: number | null;
      reviewsCount: number | null;
      reviewsFetched: number;
    }
  | { ok: false; error: string }
> {
  await ensureRuntimeSchema();

  // 1. Pull resto info (nom + adresse + place_id cache)
  type Row = {
    nom: string;
    adresse: string | null;
    ville: string | null;
    pays: string | null;
    google_place_id: string | null;
    google_review_url: string | null;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT nom, adresse, ville, pays,
           google_place_id,
           google_review_url
    FROM restaurants
    WHERE id = ${restaurantId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Restaurant introuvable" };

  // 2. Récup ou résous place_id
  let placeId = row.google_place_id;
  if (!placeId) {
    // Construction de la query pour Find Place : nom + adresse complète
    const queryParts = [row.nom, row.adresse, row.ville, row.pays].filter(
      Boolean,
    );
    if (queryParts.length === 0) {
      return {
        ok: false,
        error:
          "Adresse incomplète. Renseigne au moins nom + ville pour localiser sur Google.",
      };
    }
    const query = queryParts.join(", ");
    try {
      placeId = await findPlaceId(query);
    } catch (e) {
      console.error("[google-places] findPlaceId failed:", e);
      return {
        ok: false,
        error:
          e instanceof Error
            ? `Recherche Google: ${e.message}`
            : "Recherche Google échouée",
      };
    }
    if (!placeId) {
      return {
        ok: false,
        error:
          "Google n'a pas trouvé ton restaurant. Vérifie le nom + l'adresse, ou ajoute manuellement l'URL Google Reviews.",
      };
    }
    // Save permanent
    try {
      await prisma.$executeRaw`
        UPDATE restaurants
        SET google_place_id = ${placeId}
        WHERE id = ${restaurantId}
      `;
    } catch (e) {
      console.warn("[google-places] save place_id failed (continuing):", e);
    }
  }

  // 3. Fetch details + reviews
  let details: Awaited<ReturnType<typeof fetchPlaceDetails>>;
  try {
    details = await fetchPlaceDetails(placeId, { lang: "fr" });
  } catch (e) {
    console.error("[google-places] fetchPlaceDetails failed:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Google API: ${e.message}`
          : "Google API échouée",
    };
  }
  if (!details) {
    return {
      ok: false,
      error: "Google n'a pas retourné de détails (place_id obsolète ?)",
    };
  }

  // 4. Save en DB
  const reviewsJson = JSON.stringify(details.reviews ?? []);
  try {
    await prisma.$executeRaw`
      UPDATE restaurants
      SET google_rating = ${details.rating},
          google_reviews_count = ${details.user_ratings_total},
          google_reviews_json = ${reviewsJson}::jsonb,
          google_reviews_refreshed_at = NOW()
      WHERE id = ${restaurantId}
    `;
  } catch (e) {
    console.error("[google-places] save reviews failed:", e);
    return { ok: false, error: "Erreur DB lors de la sauvegarde des avis" };
  }

  return {
    ok: true,
    rating: details.rating,
    reviewsCount: details.user_ratings_total,
    reviewsFetched: details.reviews.length,
  };
}

/**
 * Type des reviews tels que stockés en DB (post-fetch).
 * Identique à GoogleReview mais on l'exporte pour les consumers.
 */
export type StoredGoogleReview = GoogleReview;
