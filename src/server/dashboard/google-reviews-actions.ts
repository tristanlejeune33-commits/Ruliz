"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { invalidateSiteCache } from "@/server/public/restaurant-site";
import { refreshRestaurantGoogleReviews } from "@/server/integrations/google-places";

/**
 * Rafraîchit manuellement les avis Google du resto courant (depuis
 * /dashboard/site → bouton "Rafraîchir maintenant").
 *
 * Rate limit en mémoire : 1 refresh / minute / resto. Évite le spam
 * d'appels Google et l'épuisement du crédit gratuit.
 */

const lastRefresh = new Map<string, number>();
function checkRateLimit(restaurantId: string, cooldownMs = 60_000): boolean {
  const last = lastRefresh.get(restaurantId);
  if (last && Date.now() - last < cooldownMs) return false;
  lastRefresh.set(restaurantId, Date.now());
  return true;
}

export async function refreshGoogleReviewsAction(): Promise<
  | { ok: true; rating: number | null; count: number | null; fetched: number }
  | { ok: false; error: string }
> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;
  const key = restaurantId.toString();

  if (!checkRateLimit(key)) {
    return {
      ok: false,
      error: "Patiente une minute entre deux refresh.",
    };
  }

  // Plan gate — Pro/Premium uniquement (cohérent avec le site vitrine)
  if (restaurant.plan === "freemium") {
    return {
      ok: false,
      error: "Les avis Google nécessitent un plan Pro ou Premium.",
    };
  }

  const res = await refreshRestaurantGoogleReviews(restaurantId);
  if (!res.ok) return res;

  // Invalide les caches site pour que les nouveaux avis apparaissent
  // immédiatement sur le mini-site public.
  await invalidateSiteCache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");

  return {
    ok: true,
    rating: res.rating,
    count: res.reviewsCount,
    fetched: res.reviewsFetched,
  };
}
