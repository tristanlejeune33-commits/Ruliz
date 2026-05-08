import "server-only";
import { redis } from "@/lib/redis";
import {
  SUPPORTED_LANGS,
  type SupportedLang,
} from "@/server/translation/anthropic";
import {
  translateCategorieToLang,
  translateProduitToLang,
  translateRestaurantMenu,
} from "@/server/translation/service";
import { inngest } from "./client";

const TARGET_LANGS = SUPPORTED_LANGS.filter((l) => l !== "fr");

async function invalidateRedisForRestaurant(restaurantId: string) {
  if (!redis) return 0;
  const keys = await redis.keys(`carte:${restaurantId}:*`);
  if (keys.length > 0) await redis.del(...keys);
  return keys.length;
}

/**
 * When a produit is updated/created, translate it to all target langs.
 */
export const onProduitUpdated = inngest.createFunction(
  {
    id: "translate-produit",
    retries: 3,
    triggers: [{ event: "produit/updated" }],
  },
  async ({ event, step }) => {
    const produitIdStr = event.data.produitId as string;
    const restaurantIdStr = event.data.restaurantId as string;
    const produitId = BigInt(produitIdStr);

    for (const lang of TARGET_LANGS) {
      await step.run(`translate-${lang}`, async () => {
        return translateProduitToLang({
          produitId,
          targetLang: lang as SupportedLang,
        });
      });
    }

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return { produitId: produitIdStr, langsTranslated: TARGET_LANGS.length };
  },
);

/**
 * When a categorie is updated, retranslate it.
 */
export const onCategorieUpdated = inngest.createFunction(
  {
    id: "translate-categorie",
    retries: 3,
    triggers: [{ event: "categorie/updated" }],
  },
  async ({ event, step }) => {
    const categorieId = BigInt(event.data.categorieId as string);
    const restaurantIdStr = event.data.restaurantId as string;

    for (const lang of TARGET_LANGS) {
      await step.run(`translate-${lang}`, async () => {
        return translateCategorieToLang({
          categorieId,
          targetLang: lang as SupportedLang,
        });
      });
    }

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return { categorieId: event.data.categorieId };
  },
);

/**
 * Bulk translate the entire menu of a restaurant.
 */
export const onMenuTranslate = inngest.createFunction(
  {
    id: "translate-restaurant-menu",
    retries: 1,
    triggers: [{ event: "restaurant/menu.translate" }],
  },
  async ({ event, step }) => {
    const restaurantIdStr = event.data.restaurantId as string;
    const restaurantId = BigInt(restaurantIdStr);

    const result = await step.run("translate-menu", () =>
      translateRestaurantMenu({ restaurantId }),
    );

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return result;
  },
);

/**
 * Manual cache invalidation event.
 */
export const onCacheInvalidate = inngest.createFunction(
  {
    id: "invalidate-cache",
    retries: 1,
    triggers: [{ event: "carte/cache.invalidate" }],
  },
  async ({ event }) => {
    const invalidated = await invalidateRedisForRestaurant(
      event.data.restaurantId as string,
    );
    return { invalidated };
  },
);

export const allFunctions = [
  onProduitUpdated,
  onCategorieUpdated,
  onMenuTranslate,
  onCacheInvalidate,
];
