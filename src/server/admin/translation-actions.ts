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
 * Re-traduit le menu d'un restaurant — version admin (peut viser n'importe
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
