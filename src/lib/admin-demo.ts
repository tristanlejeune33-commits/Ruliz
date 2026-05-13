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
 *   2. ensureAdminDemoRestaurant() crée le resto démo si manquant :
 *      - Logo Ruliz, bannière, branding bleu, plan premium
 *      - 5 catégories × 4 plats = 20 produits avec photos Unsplash
 *      - Un jeu roulette d'avis Google avec 5 lots
 *      - Un popup "Happy Hour" pour démontrer le système
 *   3. Si un resto démo existe mais avec peu de contenu (<8 produits),
 *      régénère. Sinon respecte le custom du user.
 *   4. Cookies admin_demo + active_restaurant set sur la NextResponse,
 *      redirige vers /dashboard.
 *
 * Distinct du système d'impersonation (lib/impersonation.ts) qui sert
 * au SAV.
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
    maxAge: 60 * 60 * 8, // 8h
    path: "/",
  });
}

export async function clearAdminDemoFlag() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_DEMO_COOKIE);
}

/**
 * Retourne le resto démo de l'admin. Crée le tout si pas existant,
 * régénère si l'ancien seed était pauvre.
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
    if (totalProduits >= 8) {
      // Déjà customisé (≥8 produits) → on respecte
      const fresh = await prisma.restaurant.findUnique({
        where: { id: existing.id },
      });
      return fresh!;
    }
    // Ancien seed pauvre → on drop tout (cascade) et on regénère
    await prisma.restaurant.delete({ where: { id: existing.id } });
  }

  return createRichDemoRestaurant(adminUserId);
}

// ===========================================================================
// PHOTOS UNSPLASH — URLs stables, format direct, w=800 pour optimisation
// Si l'une casse, le composant carte-public fallback gracieusement (pas
// d'image affichée, pas de crash).
// ===========================================================================
const PHOTO = {
  banniere:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80&auto=format&fit=crop",
  // Apéritifs & Vins
  cremant:
    "https://images.unsplash.com/photo-1605270012917-bf357a1fae9e?w=800&q=80&auto=format&fit=crop",
  margaux:
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80&auto=format&fit=crop",
  cocktail:
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80&auto=format&fit=crop",
  spritz:
    "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&q=80&auto=format&fit=crop",
  // Entrées
  tartare:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&auto=format&fit=crop",
  burrata:
    "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=800&q=80&auto=format&fit=crop",
  foieGras:
    "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=800&q=80&auto=format&fit=crop",
  veloute:
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80&auto=format&fit=crop",
  // Plats
  bavette:
    "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&q=80&auto=format&fit=crop",
  magret:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop",
  risotto:
    "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80&auto=format&fit=crop",
  lieu: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80&auto=format&fit=crop",
  // Desserts
  cannele:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format&fit=crop",
  tiramisu:
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80&auto=format&fit=crop",
  tarteChoco:
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80&auto=format&fit=crop",
  cafeGourmand:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&auto=format&fit=crop",
  // Boissons
  espresso:
    "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80&auto=format&fit=crop",
  the: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80&auto=format&fit=crop",
  vittel:
    "https://images.unsplash.com/photo-1564725073220-14dc4c4f8d3a?w=800&q=80&auto=format&fit=crop",
  jusPomme:
    "https://images.unsplash.com/photo-1576185850227-1f72b7f8d483?w=800&q=80&auto=format&fit=crop",
} as const;

/**
 * Génère un Bistrot Ruliz complet : 20 plats, jeu roulette, popup happy
 * hour, logo + bannière, branding bleu Ruliz. Plan premium pour
 * démontrer toutes les features Ruliz dans une démo prospect.
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
          "Une démo vivante de Ruliz — cette carte illustre tout ce que vous pouvez faire avec votre menu digital : photos, traductions automatiques en 14 langues, jeu d'avis Google, pop-ups Happy Hour, suggestions d'accompagnement.",
        theme: "light",
        fontStyle: "editorial",
        couleurPrimaire: "#26438A",
        logoUrl: "/brand/logo-mark.png",
        banniereUrl: PHOTO.banniere,
      } satisfies Prisma.RestaurantUncheckedCreateInput,
    });

    // ============== APÉRITIFS & VINS ==============
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
          imageUrl: PHOTO.cremant,
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
          imageUrl: PHOTO.margaux,
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
          imageUrl: PHOTO.cocktail,
        },
        {
          categorieId: aperitifs.id,
          titre: "Spritz Aperol",
          description: "Prosecco, Aperol, eau gazeuse, tranche d'orange.",
          prix: new Prisma.Decimal("8.00"),
          devise: "€",
          position: 3,
          imageUrl: PHOTO.spritz,
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
          imageUrl: PHOTO.tartare,
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
          imageUrl: PHOTO.burrata,
        },
        {
          categorieId: entrees.id,
          titre: "Foie gras maison & confit d'oignons",
          description: "Mi-cuit au torchon, pain de campagne toasté.",
          prix: new Prisma.Decimal("18.00"),
          devise: "€",
          origine: "FR",
          position: 2,
          imageUrl: PHOTO.foieGras,
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
          imageUrl: PHOTO.veloute,
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
          imageUrl: PHOTO.bavette,
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
          imageUrl: PHOTO.magret,
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
          imageUrl: PHOTO.risotto,
        },
        {
          categorieId: plats.id,
          titre: "Pavé de lieu jaune, beurre blanc",
          description: "Pêche atlantique, écrasé de pomme de terre à l'huile d'olive.",
          prix: new Prisma.Decimal("21.00"),
          devise: "€",
          origine: "FR",
          position: 3,
          imageUrl: PHOTO.lieu,
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
          imageUrl: PHOTO.cannele,
        },
        {
          categorieId: desserts.id,
          titre: "Tiramisu aux spéculoos",
          description: "Mascarpone fouetté, café espresso, miettes de spéculoos.",
          prix: new Prisma.Decimal("8.50"),
          devise: "€",
          position: 1,
          imageUrl: PHOTO.tiramisu,
        },
        {
          categorieId: desserts.id,
          titre: "Tarte au chocolat noir 70%",
          description: "Ganache intense, sablé breton, fleur de sel.",
          prix: new Prisma.Decimal("9.00"),
          devise: "€",
          position: 2,
          imageUrl: PHOTO.tarteChoco,
        },
        {
          categorieId: desserts.id,
          titre: "Café gourmand",
          description: "Espresso + 3 mignardises (cannelé, mousse choco, financier).",
          prix: new Prisma.Decimal("9.50"),
          devise: "€",
          position: 3,
          estNouveau: true,
          imageUrl: PHOTO.cafeGourmand,
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
          imageUrl: PHOTO.espresso,
        },
        {
          categorieId: boissons.id,
          titre: "Thé bio (gamme Kusmi)",
          description: "Anastasia, Detox, Rooibos vanille, English Breakfast.",
          prix: new Prisma.Decimal("4.00"),
          devise: "€",
          position: 1,
          imageUrl: PHOTO.the,
        },
        {
          categorieId: boissons.id,
          titre: "Vittel 50cl",
          description: "Eau de source plate.",
          prix: new Prisma.Decimal("4.00"),
          descriptionPrix: "50cl",
          devise: "€",
          position: 2,
          imageUrl: PHOTO.vittel,
        },
        {
          categorieId: boissons.id,
          titre: "Jus de pomme bio artisanal",
          description: "Pommes du Périgord, pressées à froid · 25cl.",
          prix: new Prisma.Decimal("5.00"),
          devise: "€",
          origine: "FR",
          position: 3,
          imageUrl: PHOTO.jusPomme,
        },
      ],
    });

    // ============== JEU ROULETTE D'AVIS GOOGLE ==============
    await tx.jeu.create({
      data: {
        restaurantId: resto.id,
        nom: "Roulette d'avis Google",
        actif: true,
        autoPopup: false,
        autoPopupDelaySec: 5,
        configJson: {
          cta: "Laisse-nous un avis Google et tente ta chance — 1 lot offert à chaque participation !",
          require_google_review: true,
          lots: [
            { label: "Café offert ☕", probabilite: 50 },
            { label: "Apéritif maison offert 🍹", probabilite: 25 },
            { label: "Dessert maison offert 🍰", probabilite: 15 },
            { label: "Bouteille de Margaux 🍷", probabilite: 7 },
            { label: "Réessaye demain !", probabilite: 3 },
          ],
        } as Prisma.InputJsonValue,
      },
    });

    // ============== POPUP HAPPY HOUR ==============
    await tx.popup.create({
      data: {
        restaurantId: resto.id,
        titre: "Happy Hour 🍸",
        description:
          "Cocktail maison + tapas du jour à 12€ — tous les jours de 18h à 20h. Le moment idéal pour découvrir notre carte.",
        imageUrl: PHOTO.cocktail,
        ctaLabel: "Voir les apéritifs",
        actif: true,
        heureDebut: "18:00",
        heureFin: "20:00",
      },
    });

    return resto;
  });
}
