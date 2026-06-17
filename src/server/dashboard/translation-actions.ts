"use server";

import { revalidatePath } from "next/cache";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { assertFeature } from "@/lib/plan-gate";
import { redis } from "@/lib/redis";
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

  // Gating serveur : traduction IA = feature Pro+ (l'auto-heal de la
  // carte publique n'est pas concerné — il passe par le service direct,
  // pas par cette action utilisateur)
  const gate = await assertFeature("iaTranslation");
  if (!gate.ok) return gate;

  // 1. Pre-flight check
  if (!getAnthropic()) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY manquante côté serveur. Ajoute-la dans .env.local (dev) ou Railway → Variables (prod), redémarre, puis réessaie.",
    };
  }

  // 2. Bouton MANUEL = toujours SYNCHRONE.
  // Avant : si INNGEST_EVENT_KEY était présent, on déléguait à Inngest et on
  // renvoyait un succès optimiste ("dispo dans 1-2 min") SANS vérifier que le
  // worker traite vraiment l'event. Si l'app Inngest n'est pas enregistrée /
  // le signing key ne matche pas → l'event part dans le vide, le toast dit
  // "lancée" mais RIEN n'est traduit → "ça marche pas du tout".
  // Le bouton étant déclenché par l'utilisateur (qui attend un résultat), on
  // exécute la traduction en direct et on renvoie les VRAIS compteurs.
  // (L'auto-traduction à la sauvegarde garde, elle, son fallback after().)
  console.log(
    `[retranslateMenu] sync start for restaurant ${bigId}, langs=${langs?.join(",") ?? "all"}`,
  );
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
