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
 *   2. Le handler ensureAdminDemoRestaurant() crée le resto démo si
 *      manquant, avec un menu COMPLET (5 catégories × 4 plats, badges
 *      NEW, descriptions appétissantes, branding bleu Ruliz, plan
 *      premium pour montrer toutes les features).
 *   3. Si un resto démo existe mais avec peu de contenu (< 8 produits),
 *      on assume que c'est un ancien seed obsolète et on le régénère.
 *      Si > 8 produits, on respecte le travail du user (ne touche à rien).
 *   4. Set cookies `ruliz_admin_demo=1` + `ruliz_active_restaurant=<id>`.
 *   5. Redirect /dashboard → bandeau orange "Mode démo · Retour à l'admin".
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
 * Retourne le resto démo de l'admin. Crée le tout (resto + menu complet)
 * si pas encore existant. Régénère si l'ancien seed était pauvre.
 */
export async function ensureAdminDemoRestaurant(adminUserId: number) {
  const existing = await prisma.restaurant.findFirst({
    where: { userId: adminUserId },
    include: {
      categories: { include: { produits: { select: { id: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    const totalProduits = existing.categories.reduce(
      (sum, c) => sum + c.produits.length,
      0,
    );
    // Si déjà un menu costaud (≥ 8 produits), on assume customisation
    // par l'admin → on garde tel quel.
    if (totalProduits >= 8) {
      // Réutilise le resto existant (sans les includes) pour cohérence type
      const fresh = await prisma.restaurant.findUnique({
        where: { id: existing.id },
      });
      return fresh!;
    }
    // Sinon, c'est l'ancien seed (2 produits). On drop tout le resto
    // démo et on regénère avec le seed riche. Cascade supprime aussi
    // categories + produits + qrcodes + jeux + popups.
    await prisma.restaurant.delete({ where: { id: existing.id } });
  }

  return createRichDemoRestaurant(adminUserId);
}

/**
 * Génère le menu complet du Bistrot Ruliz — la carte de démo officielle.
 * 5 catégories × 4 produits ≈ 20 plats variés, badges NEW, origines,
 * prix et descriptions appétissantes. Plan premium pour pouvoir montrer
 * toutes les features (roulette d'avis, pop-ups, SMS, etc.) lors d'une
 * démo prospect.
 */
async function createRichDemoRestaurant(adminUserId: number) {
  return prisma.$transaction(async (tx) => {
    const resto = await tx.restaurant.create({
      data: {
        userId: adminUserId,
        nom: "Bistrot Ruliz",
        ville: "Bordeaux",
        pays: "France",
        plan: "premium",
        statut: "actif",
        deviseDefault: "€",
        description:
          "Une démo vivante de Ruliz — cette carte illustre tout ce que vous pouvez faire avec votre menu digital : photos, allergènes, traductions automatiques en 14 langues, suggestions d'accompagnement, jeu d'avis Google.",
        theme: "light",
        fontStyle: "editorial",
        couleurPrimaire: "#26438A",
      } satisfies Prisma.RestaurantUncheckedCreateInput,
    });

    // ============== APÉRITIFS ==============
    const aperitifs = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Apéritifs & Vins",
        icone: "wine",
        position: 0,
      },
    });
    await tx.produit.createMany({
      data: [
        {
          categorieId: aperitifs.id,
          titre: "Coupe de Crémant de Bordeaux",
          description: "Domaine local, bulles fines et notes briochées.",
          prix: new Prisma.Decimal("6.50"),
          devise: "€",
          position: 0,
        },
        {
          categorieId: aperitifs.id,
          titre: "Margaux 2019",
          description: "Médoc · grand cru bourgeois · arômes de fruits noirs.",
          prix: new Prisma.Decimal("12.00"),
          descriptionPrix: "15cl",
          devise: "€",
          origine: "FR",
          position: 1,
        },
        {
          categorieId: aperitifs.id,
          titre: "Cocktail « Le Ruliz »",
          description:
            "Gin local, citron vert, sirop de gentiane, branche de romarin fumée.",
          prix: new Prisma.Decimal("9.50"),
          devise: "€",
          position: 2,
          estNouveau: true,
        },
        {
          categorieId: aperitifs.id,
          titre: "Spritz Aperol",
          description: "Prosecco, Aperol, eau gazeuse, tranche d'orange.",
          prix: new Prisma.Decimal("8.00"),
          devise: "€",
          position: 3,
        },
      ],
    });

    // ============== ENTRÉES ==============
    const entrees = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Entrées",
        icone: "utensils",
        position: 1,
      },
    });
    await tx.produit.createMany({
      data: [
        {
          categorieId: entrees.id,
          titre: "Tartare de bœuf Charolais",
          description:
            "Coupé au couteau, jaune d'œuf bio, câpres, échalotes, frites maison.",
          prix: new Prisma.Decimal("16.00"),
          devise: "€",
          origine: "FR",
          position: 0,
          estNouveau: true,
        },
        {
          categorieId: entrees.id,
          titre: "Burrata de Pouilles",
          description:
            "Crémeuse à souhait, tomates anciennes, pesto basilic maison, focaccia tiède.",
          prix: new Prisma.Decimal("14.00"),
          devise: "€",
          origine: "IT",
          position: 1,
        },
        {
          categorieId: entrees.id,
          titre: "Foie gras maison & confit d'oignons",
          description: "Mi-cuit au torchon, pain de campagne toasté.",
          prix: new Prisma.Decimal("18.00"),
          devise: "€",
          origine: "FR",
          position: 2,
        },
        {
          categorieId: entrees.id,
          titre: "Velouté de potimarron",
          description:
            "Crème de châtaigne, huile de noisettes torréfiées, croûtons.",
          prix: new Prisma.Decimal("9.00"),
          devise: "€",
          position: 3,
          titreRemarque: "Végétarien",
          descriptionRemarque: "Sans gluten possible",
        },
      ],
    });

    // ============== PLATS ==============
    const plats = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Plats",
        icone: "beef",
        position: 2,
      },
    });
    await tx.produit.createMany({
      data: [
        {
          categorieId: plats.id,
          titre: "Bavette d'aloyau, sauce béarnaise",
          description: "Bœuf race à viande, frites maison, salade de saison.",
          prix: new Prisma.Decimal("22.00"),
          devise: "€",
          origine: "FR",
          position: 0,
        },
        {
          categorieId: plats.id,
          titre: "Magret de canard, jus à la cerise",
          description:
            "Cuisson rosée, purée de patate douce, légumes glacés.",
          prix: new Prisma.Decimal("24.00"),
          devise: "€",
          origine: "FR",
          position: 1,
        },
        {
          categorieId: plats.id,
          titre: "Risotto aux cèpes",
          description:
            "Arborio crémeux, cèpes du Périgord, copeaux de parmesan affiné 24 mois.",
          prix: new Prisma.Decimal("19.00"),
          devise: "€",
          position: 2,
          estNouveau: true,
          titreRemarque: "Végétarien",
        },
        {
          categorieId: plats.id,
          titre: "Pavé de lieu jaune, beurre blanc",
          description: "Pêche atlantique, écrasé de pomme de terre à l'huile d'olive.",
          prix: new Prisma.Decimal("21.00"),
          devise: "€",
          origine: "FR",
          position: 3,
        },
      ],
    });

    // ============== DESSERTS ==============
    const desserts = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Desserts",
        icone: "cake",
        position: 3,
      },
    });
    await tx.produit.createMany({
      data: [
        {
          categorieId: desserts.id,
          titre: "Cannelé bordelais & crème vanille",
          description:
            "La spécialité bordelaise · croûte caramélisée, cœur moelleux à la vanille de Madagascar.",
          prix: new Prisma.Decimal("7.00"),
          devise: "€",
          origine: "FR",
          position: 0,
        },
        {
          categorieId: desserts.id,
          titre: "Tiramisu aux spéculoos",
          description: "Mascarpone fouetté, café espresso, miettes de spéculoos.",
          prix: new Prisma.Decimal("8.50"),
          devise: "€",
          position: 1,
        },
        {
          categorieId: desserts.id,
          titre: "Tarte au chocolat noir 70%",
          description: "Ganache intense, sablé breton, fleur de sel.",
          prix: new Prisma.Decimal("9.00"),
          devise: "€",
          position: 2,
        },
        {
          categorieId: desserts.id,
          titre: "Café gourmand",
          description: "Espresso + 3 mignardises (cannelé, mousse choco, financier).",
          prix: new Prisma.Decimal("9.50"),
          devise: "€",
          position: 3,
          estNouveau: true,
        },
      ],
    });

    // ============== BOISSONS ==============
    const boissons = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Boissons",
        icone: "coffee",
        position: 4,
      },
    });
    await tx.produit.createMany({
      data: [
        {
          categorieId: boissons.id,
          titre: "Café espresso",
          description: "Torréfaction artisanale bordelaise.",
          prix: new Prisma.Decimal("2.50"),
          devise: "€",
          position: 0,
        },
        {
          categorieId: boissons.id,
          titre: "Thé bio (gamme Kusmi)",
          description: "Anastasia, Detox, Rooibos vanille, English Breakfast.",
          prix: new Prisma.Decimal("4.00"),
          devise: "€",
          position: 1,
        },
        {
          categorieId: boissons.id,
          titre: "Vittel 50cl",
          description: "Eau de source plate.",
          prix: new Prisma.Decimal("4.00"),
          descriptionPrix: "50cl",
          devise: "€",
          position: 2,
        },
        {
          categorieId: boissons.id,
          titre: "Jus de pomme bio artisanal",
          description: "Pommes du Périgord, pressées à froid · 25cl.",
          prix: new Prisma.Decimal("5.00"),
          devise: "€",
          origine: "FR",
          position: 3,
        },
      ],
    });

    return resto;
  });
}
