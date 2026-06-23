"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  getAnthropic,
  SUPPORTED_LANGS,
} from "@/server/translation/anthropic";
import { translateRestaurantMenu } from "@/server/translation/service";
import { translatePanelBatch } from "@/server/dashboard/translate-panel-actions";

export type AdminActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Vérifie que l'utilisateur courant est admin (rôle business "admin").
 */
async function assertAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { role: true } } },
  });
  return authUser?.user?.role === "admin";
}

/**
 * Re-traduit le menu d'un restaurant version admin (peut viser n'importe
 * quel restaurant, pas juste le sien). Synchrone et bloque jusqu'à fin.
 */
export async function adminRetranslateRestaurant(
  restaurantId: string,
  force: boolean = false,
): Promise<AdminActionResult<{ produits: number; categories: number }>> {
  const isAdmin = await assertAdmin();
  if (!isAdmin) return { ok: false, error: "Accès admin requis" };

  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  if (!getAnthropic()) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY manquante côté serveur. Vérifie les variables Railway.",
    };
  }

  // Vérifie que le restaurant existe (sécurité)
  const exists = await prisma.restaurant.findUnique({
    where: { id: bigId },
    select: { id: true, nom: true },
  });
  if (!exists) return { ok: false, error: "Restaurant introuvable" };

  console.log(
    `[admin.retranslate] start for restaurant ${bigId} (${exists.nom}), force=${force}`,
  );

  try {
    const stats = await translateRestaurantMenu({
      restaurantId: bigId,
      force,
    });

    // Purge Redis cache pour toutes les langues
    if (redis) {
      try {
        const keys = SUPPORTED_LANGS.map(
          (l) => `carte:${bigId.toString()}:${l}`,
        );
        await redis.del(...keys);
      } catch (err) {
        console.warn("[admin.retranslate] redis purge failed:", err);
      }
    }

    revalidatePath(`/carte/${bigId.toString()}`);
    revalidatePath("/admin/restaurants");

    console.log(
      `[admin.retranslate] done: ${stats.produits} produits, ${stats.categories} categories`,
    );

    return {
      ok: true,
      data: stats,
    };
  } catch (err) {
    console.error("[admin.retranslate] failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de traduction",
    };
  }
}

/**
 * Pré-traduit TOUTES les chaînes UI du panel déjà rencontrées vers les 7
 * langues, pour remplir `panel_translations_cache`. Ainsi, à l'ouverture d'une
 * page, le serveur injecte le dico complet (cf. getPanelTranslations) et tout
 * s'affiche traduit instantanément — plus aucun « chargement ».
 *
 * Source des chaînes : toutes les `source_text` distinctes déjà en cache (peu
 * importe la langue). Il n'existe pas de registre central de tous les textes UI
 * (l'auto-traduction les collecte au fil de la navigation) : ce bouton complète
 * donc la matrice pour ce qui a DÉJÀ été vu au moins une fois dans une langue.
 * Conseil : naviguer une fois dans le panel (toutes les pages) puis cliquer ici.
 *
 * Le travail tourne en arrière-plan (`after`) : l'action rend la main tout de
 * suite avec le nombre de chaînes à couvrir. Les hits cache sont gratuits, seuls
 * les manquants appellent Anthropic Haiku.
 */
export async function warmAllPanelTranslations(): Promise<
  AdminActionResult<{ strings: number; langs: number }>
> {
  const isAdmin = await assertAdmin();
  if (!isAdmin) return { ok: false, error: "Accès admin requis" };

  if (!getAnthropic()) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY manquante côté serveur.",
    };
  }

  // Toutes les chaînes source distinctes connues (toutes langues confondues).
  let sources: string[] = [];
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ source_text: string }>>(
      `SELECT DISTINCT source_text FROM "panel_translations_cache" LIMIT 5000`,
    );
    sources = rows.map((r) => r.source_text).filter(Boolean);
  } catch (err) {
    console.error("[admin.warmPanel] sources query failed:", err);
    return { ok: false, error: "Lecture du cache impossible" };
  }

  if (sources.length === 0) {
    return {
      ok: false,
      error:
        "Aucune chaîne en cache. Navigue d'abord dans le panel dans une langue étrangère, puis relance.",
    };
  }

  const targetLangs = SUPPORTED_LANGS.filter((l) => l !== "fr");

  // Lancement en arrière-plan : on ne bloque pas la requête HTTP.
  after(async () => {
    console.log(
      `[admin.warmPanel] start: ${sources.length} chaînes × ${targetLangs.length} langues`,
    );
    for (const lang of targetLangs) {
      try {
        await translatePanelBatch(sources, lang);
        console.log(`[admin.warmPanel] ${lang} ✓`);
      } catch (err) {
        console.warn(`[admin.warmPanel] ${lang} failed:`, err);
      }
    }
    console.log("[admin.warmPanel] done");
  });

  return {
    ok: true,
    data: { strings: sources.length, langs: targetLangs.length },
  };
}
