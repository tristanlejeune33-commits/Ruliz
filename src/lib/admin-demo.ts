import "server-only";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * "Mode démo admin" — permet à un compte admin (Tristan) d'utiliser
 * /dashboard avec un restaurant fictif lui appartenant pour préparer
 * des démos prospects ou tester l'UI client end-to-end.
 *
 * Flow :
 *   1. Click "Ma carte démo" en sidebar admin → GET /admin/demo
 *   2. Le handler crée le resto démo si manquant (lié à user_id admin) +
 *      seed minimal (catégorie Entrées + 2 produits).
 *   3. Set cookies `ruliz_admin_demo=1` + `ruliz_active_restaurant=<id>`.
 *   4. Redirect /dashboard → `requireDashboard()` autorise l'admin si le
 *      cookie demo est set, sinon redirige vers /admin comme d'hab.
 *   5. Bandeau orange "Mode démo · Quitter" affiché dans le dashboard,
 *      bouton Quitter → /api/admin/demo/exit clear le cookie et revient
 *      sur /admin.
 *
 * Le compte admin n'est PAS un client comme les autres : il n'apparaît
 * pas dans /admin/clients (la requête filtre role=client) et son resto
 * démo n'apparaît pas dans /admin/restaurants (filtré sur le userId
 * admin, exclu).
 *
 * Distinct du système d'impersonation (lib/impersonation.ts) qui sert
 * au SAV — ici on bosse SUR son propre compte admin, pas sur celui
 * d'un client.
 */

export const ADMIN_DEMO_COOKIE = "ruliz_admin_demo";

export async function getAdminDemoFlag(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_DEMO_COOKIE)?.value === "1";
}

export async function setAdminDemoFlag() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8h — session de travail
    path: "/",
  });
}

export async function clearAdminDemoFlag() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_DEMO_COOKIE);
}

/**
 * Retourne le resto démo de l'admin. Crée le tout (resto + 1 catégorie
 * "Entrées" + 2 produits exemples) si pas encore existant.
 *
 * Idempotent : safe à appeler à chaque entrée en mode démo.
 */
export async function ensureAdminDemoRestaurant(adminUserId: number) {
  const existing = await prisma.restaurant.findFirst({
    where: { userId: adminUserId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const resto = await tx.restaurant.create({
      data: {
        userId: adminUserId,
        nom: "Démo Ruliz",
        ville: "Bordeaux",
        pays: "France",
        plan: "premium",
        description:
          "Restaurant de démonstration — utilisé pour les démos prospects et les tests internes.",
        deviseDefault: "€",
      } satisfies Prisma.RestaurantUncheckedCreateInput,
    });

    const cat = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Entrées",
        icone: "wine",
        position: 0,
      },
    });

    await tx.produit.createMany({
      data: [
        {
          categorieId: cat.id,
          titre: "Tartare de bœuf",
          description: "Couteau, jaune d'œuf, frites maison",
          prix: new Prisma.Decimal("18.00"),
          devise: "€",
          position: 0,
          estNouveau: true,
        },
        {
          categorieId: cat.id,
          titre: "Burrata de Pouilles",
          description: "Tomates anciennes, pesto basilic",
          prix: new Prisma.Decimal("14.00"),
          devise: "€",
          position: 1,
        },
      ],
    });

    return resto;
  });
}
