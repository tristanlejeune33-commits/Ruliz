"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { redis } from "@/lib/redis";
import { inngest } from "@/server/inngest/client";
import { getAnthropic, SUPPORTED_LANGS } from "@/server/translation/anthropic";
import { translateRestaurantMenu } from "@/server/translation/service";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

type RetranslateData = {
  mode: "inngest" | "background" | "sync";
  produits?: number;
  categories?: number;
};

/**
 * Trigger a full menu re-translation.
 *
 * Strategy (3-level fallback):
 *   1. Pre-check: ANTHROPIC_API_KEY must be present.
 *   2. If INNGEST_EVENT_KEY is set → fire-and-forget via Inngest (best for prod).
 *   3. Else → run in background via `after()` (Next.js 15) so the user gets
 *      an immediate response while translation runs server-side after the
 *      response is sent. This makes the feature work even without Inngest.
 */
export async function retranslateMenu(
  restaurantId: string,
): Promise<ActionResult<RetranslateData>> {
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  // 1. Pre-flight check : pas de clé Anthropic = pas de traduction possible.
  if (!getAnthropic()) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY manquante côté serveur. Ajoute-la dans Railway → Variables, redéploie, puis réessaie.",
    };
  }

  // 2. Si Inngest est configuré, on délègue (clean prod path).
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({
        name: "restaurant/menu.translate",
        data: { restaurantId: bigId.toString() },
      });
      revalidatePath("/dashboard/menu");
      revalidatePath(`/carte/${bigId.toString()}`);
      return { ok: true, data: { mode: "inngest" } };
    } catch (e) {
      console.warn(
        "[retranslateMenu] inngest send failed, falling back to background:",
        e,
      );
      // tombe dans le fallback ci-dessous
    }
  }

  // 3. Fallback : exécution en background via Next.js `after()`.
  // La réponse part immédiatement, la traduction tourne après envoi.
  after(async () => {
    try {
      console.log(
        `[retranslateMenu] background start for restaurant ${bigId}`,
      );
      const stats = await translateRestaurantMenu({ restaurantId: bigId });
      console.log(
        `[retranslateMenu] background done: ${stats.produits} produits, ${stats.categories} categories`,
      );

      // Purge Redis cache pour toutes les langues
      if (redis) {
        try {
          const keys = SUPPORTED_LANGS.map(
            (l) => `carte:${bigId.toString()}:${l}`,
          );
          await redis.del(...keys);
        } catch (err) {
          console.warn("[retranslateMenu] redis purge failed:", err);
        }
      }
      // Re-revalidate after work is done so users see fresh content.
      revalidatePath(`/carte/${bigId.toString()}`);
    } catch (err) {
      console.error("[retranslateMenu] background translation failed:", err);
    }
  });

  revalidatePath("/dashboard/menu");
  return { ok: true, data: { mode: "background" } };
}
