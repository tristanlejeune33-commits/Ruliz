"use server";

import { revalidatePath } from "next/cache";
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
import { PANEL_STRINGS } from "@/lib/panel-strings-catalog.generated";

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
 * Source des chaînes : le CATALOGUE statique `PANEL_STRINGS` (extrait du code
 * par scripts/extract-ui-strings.mjs) ∪ toutes les `source_text` déjà en cache.
 * Couverture quasi-complète SANS navigation manuelle préalable : un seul clic
 * traduit tout le panel dans les 7 langues.
 *
 * Le travail tourne en arrière-plan (`after`) : l'action rend la main tout de
 * suite avec le nombre de chaînes à couvrir. Les hits cache sont gratuits, seuls
 * les manquants appellent Anthropic Haiku.
 */
/**
 * Avancement de la pré-traduction : combien de chaînes du catalogue sont déjà
 * en cache, par langue. Permet de savoir si « Pré-traduire tout » est fini.
 */
export async function getPanelWarmStatus(): Promise<
  AdminActionResult<{
    total: number;
    perLang: Array<{ lang: string; count: number }>;
    done: boolean;
  }>
> {
  const isAdmin = await assertAdmin();
  if (!isAdmin) return { ok: false, error: "Accès admin requis" };

  const total = PANEL_STRINGS.length;
  const targetLangs = SUPPORTED_LANGS.filter((l) => l !== "fr");

  let counts = new Map<string, number>();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ lang: string; c: bigint }>
    >(
      `SELECT lang, COUNT(DISTINCT source_text) AS c
       FROM "panel_translations_cache"
       WHERE lang = ANY($1::text[])
       GROUP BY lang`,
      targetLangs as unknown as string[],
    );
    counts = new Map(rows.map((r) => [r.lang, Number(r.c)]));
  } catch (err) {
    console.error("[admin.warmStatus] query failed:", err);
    return { ok: false, error: "Lecture du cache impossible" };
  }

  // On plafonne l'affichage au total du catalogue (le cache peut contenir des
  // chaînes en plus, collectées au fil de la navigation).
  const perLang = targetLangs.map((lang) => ({
    lang,
    count: Math.min(total, counts.get(lang) ?? 0),
  }));
  const done = perLang.every((p) => p.count >= total);

  return { ok: true, data: { total, perLang, done } };
}

/**
 * Traduit UN PETIT LOT de chaînes manquantes, puis rend la main. Le client
 * rappelle cette action en boucle jusqu'à `done: true`.
 *
 * Pourquoi pas un gros job `after()` ? Parce qu'il se faisait tuer au bout de
 * ~2 min et que 20 appels parallèles × 6 langues saturaient le rate-limit
 * Anthropic (429 → backoff → blocage). Ici : courtes requêtes, concurrence
 * modérée, et les chaînes en échec restent "manquantes" → reprises au lot
 * suivant. Jamais bloqué, reprend toujours là où il en était.
 */
export async function warmPanelChunk(): Promise<
  AdminActionResult<{ done: boolean; remaining: number; processed: number }>
> {
  const isAdmin = await assertAdmin();
  if (!isAdmin) return { ok: false, error: "Accès admin requis" };

  if (!getAnthropic()) {
    return { ok: false, error: "ANTHROPIC_API_KEY manquante côté serveur." };
  }

  const targetLangs = SUPPORTED_LANGS.filter((l) => l !== "fr");
  // Nombre de chaînes traitées PAR LANGUE et par appel. Toutes les langues
  // progressent ensemble. ~40 × 6 = 240 traductions/lot (≈ quelques secondes).
  const PER_LANG = 40;
  const CONCURRENCY = 10;

  let remaining = 0;
  let processed = 0;

  for (const lang of targetLangs) {
    let cached = new Set<string>();
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ source_text: string }>>(
        `SELECT source_text FROM "panel_translations_cache" WHERE lang = $1`,
        lang,
      );
      cached = new Set(rows.map((r) => r.source_text));
    } catch {
      // cache illisible → on retente plus tard
    }
    const missing = PANEL_STRINGS.filter((s) => !cached.has(s));
    remaining += missing.length;
    const slice = missing.slice(0, PER_LANG);
    if (slice.length > 0) {
      try {
        await translatePanelBatch(slice, lang, CONCURRENCY);
        processed += slice.length;
      } catch (err) {
        console.warn(`[admin.warmChunk] ${lang} batch failed:`, err);
      }
    }
  }

  const stillRemaining = Math.max(0, remaining - processed);
  return {
    ok: true,
    data: { done: stillRemaining === 0, remaining: stillRemaining, processed },
  };
}
