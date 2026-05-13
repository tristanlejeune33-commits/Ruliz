"use server";

import { revalidatePath } from "next/cache";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { redis } from "@/lib/redis";
import { inngest } from "@/server/inngest/client";
import {
  getAnthropic,
  SUPPORTED_LANGS,
  type SupportedLang,
} from "@/server/translation/anthropic";
import { translateRestaurantMenu } from "@/server/translation/service";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

type RetranslateData = {
  mode: "inngest" | "sync";
  produits?: number;
  categories?: number;
};

/**
 * Lance une re-traduction du menu.
 *
 * 3 niveaux de fallback :
 *   1. Pre-check : ANTHROPIC_API_KEY doit être présente.
 *   2. Si INNGEST_EVENT_KEY est défini → délègue à Inngest (clean prod path,
 *      réponse immédiate, traduction async, robuste).
 *   3. Sinon → exécute SYNCHRONEMENT et awaite la fin (peut prendre 30s-2min
 *      selon la taille du menu × le nombre de langues). C'est plus prévisible
 *      qu'`after()` qui pouvait être killé en dev.
 *
 * Quand Inngest n'est pas dispo (dev local par exemple), la fonction reste en
 * attente jusqu'à ce que toutes les langues soient traduites l'utilisateur
 * voit le résultat exact dans le toast.
 *
 * @param restaurantId - ID du restaurant
 * @param langs - Si défini, traduit uniquement ces langues (pour limiter le temps).
 *                Sinon traduit toutes les langues supportées (sauf 'fr').
 */
export async function retranslateMenu(
  restaurantId: string,
  langs?: SupportedLang[],
  force?: boolean,
): Promise<ActionResult<RetranslateData>> {
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  // 1. Pre-flight check
  if (!getAnthropic()) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY manquante côté serveur. Ajoute-la dans .env.local (dev) ou Railway → Variables (prod), redémarre, puis réessaie.",
    };
  }

  // 2. Inngest path (prod only quand Railway a INNGEST_EVENT_KEY)
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
        "[retranslateMenu] inngest send failed, falling back to sync:",
        e,
      );
    }
  }

  // 3. Sync path : on AWAIT la traduction et on retourne les stats réelles.
  console.log(
    `[retranslateMenu] sync start for restaurant ${bigId}, langs=${langs?.join(",") ?? "all"}`,
  );
  try {
    const stats = await translateRestaurantMenu({
      restaurantId: bigId,
      langs,
      force,
    });

    // Purge Redis pour toutes les langues
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

    revalidatePath("/dashboard/menu");
    revalidatePath(`/carte/${bigId.toString()}`);

    console.log(
      `[retranslateMenu] sync done: ${stats.produits} produits, ${stats.categories} categories`,
    );

    return {
      ok: true,
      data: {
        mode: "sync",
        produits: stats.produits,
        categories: stats.categories,
      },
    };
  } catch (err) {
    console.error("[retranslateMenu] sync failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de traduction",
    };
  }
}
