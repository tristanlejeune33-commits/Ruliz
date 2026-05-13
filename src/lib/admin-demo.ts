import "server-only";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * "Mode démo admin" · restaurant fictif lié au compte admin pour préparer
 * des démos prospects (carte complète qui démontre 100% des features Ruliz).
 *
 * Flow :
 *   1. Click "Ma carte démo" en sidebar admin → GET /admin/demo
 *   2. ensureAdminDemoRestaurant() crée le Bistrot Ruliz si manquant :
 *      - Logo Ruliz + bannière + branding bleu signature
 *      - 5 catégories dont 1 avec sous-catégories (Plats → Viandes/Poissons/Végétariens)
 *      - 20 produits avec photos, vignettes, allergènes, suggestions d'accompagnement
 *      - Une roulette d'avis Google (5 lots)
 *      - 2 pop-ups (Happy Hour 18-20h + Brunch dominical)
 *   3. Régénère si <8 produits (ancien seed obsolète), respecte custom sinon.
 *   4. Cookies admin_demo + active_restaurant set sur la NextResponse.
 *
 * Distinct du système d'impersonation (lib/impersonation.ts) qui sert au SAV.
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

export async function ensureAdminDemoRestaurant(adminUserId: number) {
  const existing = await prisma.restaurant.findFirst({
    where: { userId: adminUserId },
    include: {
      categories: { include: { produits: { select: { id: true } } } },
      jeux: { select: { id: true } },
      popups: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    const totalProduits = existing.categories.reduce(
      (sum, c) => sum + c.produits.length,
      0,
    );
    const hasJeu = existing.jeux.length > 0;
    const hasPopup = existing.popups.length > 0;

    // "Seed complet" = au moins 8 produits + 1 jeu + 1 popup. Tant que les
    // 3 critères sont remplis, on assume que l'admin a customisé et on garde
    // intact. Si l'un manque, on régénère TOUT pour rattraper les features
    // ajoutées dans les commits récents (jeu, popups, vignettes…).
    if (totalProduits >= 8 && hasJeu && hasPopup) {
      const fresh = await prisma.restaurant.findUnique({
        where: { id: existing.id },
      });
      return fresh!;
    }
    // Seed incomplet → on drop le resto entier (cascade catégories, produits,
    // jeux, popups, qrcodes, base_clients) et on régénère depuis zéro.
    await prisma.restaurant.delete({ where: { id: existing.id } });
  }

  return createRichDemoRestaurant(adminUserId);
}

// ===========================================================================
// PHOTOS UNSPLASH · URLs stables. Si une casse, carte-public fallback OK.
// ===========================================================================
const PHOTO = {
  banniere:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80&auto=format&fit=crop",
  cremant:
    "https://images.unsplash.com/photo-1605270012917-bf357a1fae9e?w=800&q=80&auto=format&fit=crop",
  margaux:
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80&auto=format&fit=crop",
  cocktail:
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80&auto=format&fit=crop",
  spritz:
    "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&q=80&auto=format&fit=crop",
  tartare:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&auto=format&fit=crop",
  burrata:
    "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=800&q=80&auto=format&fit=crop",
  foieGras:
    "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=800&q=80&auto=format&fit=crop",
  veloute:
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80&auto=format&fit=crop",
  bavette:
    "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&q=80&auto=format&fit=crop",
  magret:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop",
  risotto:
    "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80&auto=format&fit=crop",
  lieu: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80&auto=format&fit=crop",
  cannele:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format&fit=crop",
  tiramisu:
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80&auto=format&fit=crop",
  tarteChoco:
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80&auto=format&fit=crop",
  cafeGourmand:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&auto=format&fit=crop",
  espresso:
    "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80&auto=format&fit=crop",
  the: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80&auto=format&fit=crop",
  vittel:
    "https://images.unsplash.com/photo-1564725073220-14dc4c4f8d3a?w=800&q=80&auto=format&fit=crop",
  jusPomme:
    "https://images.unsplash.com/photo-1576185850227-1f72b7f8d483?w=800&q=80&auto=format&fit=crop",
  brunch:
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80&auto=format&fit=crop",
  bierePression:
    "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80&auto=format&fit=crop",
  bierIpa:
    "https://images.unsplash.com/photo-1571767454098-246b94fbcf70?w=800&q=80&auto=format&fit=crop",
  blondeGarde:
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&q=80&auto=format&fit=crop",
  cidre:
    "https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=800&q=80&auto=format&fit=crop",
  bierSansAlcool:
    "https://images.unsplash.com/photo-1542228262-3d663b306a53?w=800&q=80&auto=format&fit=crop",
} as const;

/**
 * Crée le Bistrot Ruliz complet · démo end-to-end de toutes les features.
 */
async function createRichDemoRestaurant(adminUserId: number) {
  // Récupère les IDs des vignettes & allergènes (seedés au boot, idempotent
  // dans prisma/seed.ts). On les query AVANT la transaction pour éviter de
  // les re-fetch dans chaque branche.
  const [vignettes, allergenes] = await Promise.all([
    prisma.vignette.findMany(),
    prisma.allergene.findMany(),
  ]);
  const vId = (code: string) =>
    vignettes.find((v) => v.code === code)?.id ?? null;
  const aId = (code: string) =>
    allergenes.find((a) => a.code === code)?.id ?? null;

  return prisma.$transaction(async (tx) => {
    // ============== RESTAURANT ==============
    const resto = await tx.restaurant.create({
      data: {
        userId: adminUserId,
        nom: "Bistrot Ruliz",
        ville: "Bordeaux",
        codePostal: "33000",
        adresse: "12 rue Sainte-Catherine",
        pays: "France",
        plan: "premium",
        statut: "actif",
        deviseDefault: "€",
        description:
          "Une démo vivante de Ruliz · cette carte illustre TOUTES les features : photos, allergènes, suggestions d'accompagnement, traductions 14 langues, jeu d'avis Google, pop-ups Happy Hour, sous-catégories.",
        theme: "light",
        fontStyle: "editorial",
        couleurPrimaire: "#26438A",
        logoUrl: "/brand/logo-mark.png",
        banniereUrl: PHOTO.banniere,
        // Réseaux sociaux pour montrer le footer carte publique
        instagramUrl: "https://instagram.com/ruliz",
        facebookUrl: "https://facebook.com/ruliz",
        googleReviewUrl: "https://g.page/r/ruliz",
        siteWeb: "https://ruliz.fr",
      } satisfies Prisma.RestaurantUncheckedCreateInput,
    });

    // Helper interne pour créer un produit avec ses relations en une fois.
    async function makeProduit(data: {
      categorieId: bigint;
      titre: string;
      description?: string;
      prix: string;
      descriptionPrix?: string;
      /** Variantes multi-volumes (bière demi/pinte, vin verre/bouteille…).
       *  Si défini, le champ `prix` est masqué côté carte publique au profit
       *  de la liste des variantes. */
      prixVariantes?: { label: string; prix: number }[];
      position: number;
      estNouveau?: boolean;
      origine?: string;
      titreRemarque?: string;
      descriptionRemarque?: string;
      imageUrl?: string;
      vignetteCodes?: string[];
      allergeneCodes?: string[];
    }) {
      const produit = await tx.produit.create({
        data: {
          categorieId: data.categorieId,
          titre: data.titre,
          description: data.description ?? null,
          prix: new Prisma.Decimal(data.prix),
          devise: "€",
          descriptionPrix: data.descriptionPrix ?? null,
          prixVariantes: data.prixVariantes
            ? (data.prixVariantes as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          position: data.position,
          estNouveau: data.estNouveau ?? false,
          origine: data.origine ?? null,
          titreRemarque: data.titreRemarque ?? null,
          descriptionRemarque: data.descriptionRemarque ?? null,
          imageUrl: data.imageUrl ?? null,
        },
      });
      // Vignettes (signature, fait_maison, bio, local…)
      if (data.vignetteCodes?.length) {
        const links = data.vignetteCodes
          .map((c) => vId(c))
          .filter((id): id is number => id !== null)
          .map((vignetteId) => ({ produitId: produit.id, vignetteId }));
        if (links.length) {
          await tx.produitVignette.createMany({ data: links });
        }
      }
      // Allergènes (gluten, lait, oeufs…)
      if (data.allergeneCodes?.length) {
        const links = data.allergeneCodes
          .map((c) => aId(c))
          .filter((id): id is number => id !== null)
          .map((allergeneId) => ({ produitId: produit.id, allergeneId }));
        if (links.length) {
          await tx.produitAllergene.createMany({ data: links });
        }
      }
      return produit;
    }

    // ============== CATÉGORIE 1 · APÉRITIFS & VINS ==============
    const aperitifs = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Apéritifs & Vins",
        icone: "wine",
        position: 0,
      },
    });
    const cremant = await makeProduit({
      categorieId: aperitifs.id,
      titre: "Coupe de Crémant de Bordeaux",
      description: "Domaine local, bulles fines et notes briochées.",
      prix: "6.50",
      position: 0,
      imageUrl: PHOTO.cremant,
      vignetteCodes: ["local", "bio"],
      allergeneCodes: ["sulfites"],
    });
    const margaux = await makeProduit({
      categorieId: aperitifs.id,
      titre: "Margaux 2019",
      description: "Médoc · grand cru bourgeois · arômes de fruits noirs.",
      prix: "12.00",
      descriptionPrix: "15cl",
      position: 1,
      origine: "FR",
      imageUrl: PHOTO.margaux,
      vignetteCodes: ["local", "signature"],
      allergeneCodes: ["sulfites"],
    });
    await makeProduit({
      categorieId: aperitifs.id,
      titre: "Cocktail « Le Ruliz »",
      description:
        "Gin local, citron vert, sirop de gentiane, branche de romarin fumée.",
      prix: "9.50",
      position: 2,
      estNouveau: true,
      imageUrl: PHOTO.cocktail,
      vignetteCodes: ["signature", "fait_maison"],
    });
    const spritz = await makeProduit({
      categorieId: aperitifs.id,
      titre: "Spritz Aperol",
      description: "Prosecco, Aperol, eau gazeuse, tranche d'orange.",
      prix: "8.00",
      position: 3,
      imageUrl: PHOTO.spritz,
      allergeneCodes: ["sulfites"],
    });

    // ============== CATÉGORIE 2 · ENTRÉES ==============
    const entrees = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Entrées",
        icone: "utensils",
        position: 1,
      },
    });
    const tartare = await makeProduit({
      categorieId: entrees.id,
      titre: "Tartare de bœuf Charolais",
      description:
        "Coupé au couteau, jaune d'œuf bio, câpres, échalotes, frites maison.",
      prix: "16.00",
      position: 0,
      estNouveau: true,
      origine: "FR",
      imageUrl: PHOTO.tartare,
      vignetteCodes: ["signature", "fait_maison", "local"],
      allergeneCodes: ["oeufs", "moutarde", "gluten"],
    });
    const burrata = await makeProduit({
      categorieId: entrees.id,
      titre: "Burrata de Pouilles",
      description:
        "Crémeuse à souhait, tomates anciennes, pesto basilic maison, focaccia tiède.",
      prix: "14.00",
      position: 1,
      origine: "IT",
      imageUrl: PHOTO.burrata,
      vignetteCodes: ["fait_maison", "vegetarien"],
      allergeneCodes: ["lait", "gluten"],
    });
    const foieGras = await makeProduit({
      categorieId: entrees.id,
      titre: "Foie gras maison & confit d'oignons",
      description: "Mi-cuit au torchon, pain de campagne toasté.",
      prix: "18.00",
      position: 2,
      origine: "FR",
      imageUrl: PHOTO.foieGras,
      vignetteCodes: ["signature", "fait_maison", "local"],
      allergeneCodes: ["gluten", "sulfites"],
    });
    await makeProduit({
      categorieId: entrees.id,
      titre: "Velouté de potimarron",
      description:
        "Crème de châtaigne, huile de noisettes torréfiées, croûtons.",
      prix: "9.00",
      position: 3,
      titreRemarque: "Plat végétarien",
      descriptionRemarque: "Disponible sans gluten · précise-le au serveur",
      imageUrl: PHOTO.veloute,
      vignetteCodes: ["vegetarien", "bio", "fait_maison"],
      allergeneCodes: ["lait", "fruits_a_coque"],
    });

    // ============== CATÉGORIE 3 · PLATS (avec SOUS-CATÉGORIES) ==============
    const plats = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Plats",
        icone: "beef",
        position: 2,
      },
    });
    // Sous-catégorie : Viandes
    const viandes = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        parentId: plats.id,
        titre: "Viandes",
        icone: "beef",
        position: 0,
      },
    });
    const bavette = await makeProduit({
      categorieId: viandes.id,
      titre: "Bavette d'aloyau, sauce béarnaise",
      description: "Bœuf race à viande, frites maison, salade de saison.",
      prix: "22.00",
      position: 0,
      origine: "FR",
      imageUrl: PHOTO.bavette,
      vignetteCodes: ["signature", "local"],
      allergeneCodes: ["oeufs", "moutarde", "lait"],
    });
    const magret = await makeProduit({
      categorieId: viandes.id,
      titre: "Magret de canard, jus à la cerise",
      description: "Cuisson rosée, purée de patate douce, légumes glacés.",
      prix: "24.00",
      position: 1,
      origine: "FR",
      imageUrl: PHOTO.magret,
      vignetteCodes: ["signature", "local"],
      allergeneCodes: ["sulfites"],
    });
    // Sous-catégorie : Poissons
    const poissons = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        parentId: plats.id,
        titre: "Poissons",
        icone: "fish",
        position: 1,
      },
    });
    await makeProduit({
      categorieId: poissons.id,
      titre: "Pavé de lieu jaune, beurre blanc",
      description:
        "Pêche atlantique, écrasé de pomme de terre à l'huile d'olive.",
      prix: "21.00",
      position: 0,
      origine: "FR",
      imageUrl: PHOTO.lieu,
      vignetteCodes: ["local"],
      allergeneCodes: ["poissons", "lait"],
    });
    // Sous-catégorie : Végétariens
    const veggies = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        parentId: plats.id,
        titre: "Végétariens",
        icone: "salad",
        position: 2,
      },
    });
    await makeProduit({
      categorieId: veggies.id,
      titre: "Risotto aux cèpes",
      description:
        "Arborio crémeux, cèpes du Périgord, copeaux de parmesan affiné 24 mois.",
      prix: "19.00",
      position: 0,
      estNouveau: true,
      titreRemarque: "Plat végétarien signature",
      imageUrl: PHOTO.risotto,
      vignetteCodes: ["vegetarien", "signature", "fait_maison"],
      allergeneCodes: ["lait", "sulfites"],
    });

    // ============== CATÉGORIE 4 · DESSERTS ==============
    const desserts = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Desserts",
        icone: "cake",
        position: 3,
      },
    });
    const cannele = await makeProduit({
      categorieId: desserts.id,
      titre: "Cannelé bordelais & crème vanille",
      description:
        "La spécialité bordelaise · croûte caramélisée, cœur moelleux à la vanille de Madagascar.",
      prix: "7.00",
      position: 0,
      origine: "FR",
      imageUrl: PHOTO.cannele,
      vignetteCodes: ["signature", "local", "fait_maison"],
      allergeneCodes: ["lait", "oeufs", "gluten"],
    });
    await makeProduit({
      categorieId: desserts.id,
      titre: "Tiramisu aux spéculoos",
      description: "Mascarpone fouetté, café espresso, miettes de spéculoos.",
      prix: "8.50",
      position: 1,
      imageUrl: PHOTO.tiramisu,
      vignetteCodes: ["fait_maison"],
      allergeneCodes: ["lait", "oeufs", "gluten"],
    });
    await makeProduit({
      categorieId: desserts.id,
      titre: "Tarte au chocolat noir 70%",
      description: "Ganache intense, sablé breton, fleur de sel.",
      prix: "9.00",
      position: 2,
      imageUrl: PHOTO.tarteChoco,
      vignetteCodes: ["fait_maison", "bio"],
      allergeneCodes: ["lait", "oeufs", "gluten", "soja"],
    });
    const cafeGourmand = await makeProduit({
      categorieId: desserts.id,
      titre: "Café gourmand",
      description: "Espresso + 3 mignardises (cannelé, mousse choco, financier).",
      prix: "9.50",
      position: 3,
      estNouveau: true,
      imageUrl: PHOTO.cafeGourmand,
      vignetteCodes: ["signature", "fait_maison"],
      allergeneCodes: ["lait", "oeufs", "gluten", "fruits_a_coque"],
    });

    // ============== CATÉGORIE 5 · HAPPY HOUR 🍺 ==============
    // Démontre la feature `prixVariantes` (JSON) : un seul produit avec
    // plusieurs volumes/prix (Demi 25cl / Pinte 50cl), c'est ce qui permet
    // d'afficher proprement les bières d'un bar sans dupliquer les fiches.
    const happyHour = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Happy Hour 🍺",
        icone: "beer",
        position: 4,
      },
    });
    await makeProduit({
      categorieId: happyHour.id,
      titre: "Bière Pression Bordelaise",
      description:
        "Notre brasserie locale, blonde maltée légèrement amère. -20% pendant l'Happy Hour 18h-20h.",
      prix: "3.50", // prix le plus bas (masqué côté public si variantes définies)
      prixVariantes: [
        { label: "Demi 25cl", prix: 3.5 },
        { label: "Pinte 50cl", prix: 6.5 },
      ],
      position: 0,
      origine: "FR",
      imageUrl: PHOTO.bierePression,
      vignetteCodes: ["local", "signature"],
      allergeneCodes: ["gluten"],
    });
    await makeProduit({
      categorieId: happyHour.id,
      titre: "IPA Brewdog Punk",
      description:
        "India Pale Ale écossaise, fruits tropicaux et amertume marquée.",
      prix: "4.50",
      prixVariantes: [
        { label: "Demi 25cl", prix: 4.5 },
        { label: "Pinte 50cl", prix: 8.5 },
        { label: "Bouteille 33cl", prix: 6.0 },
      ],
      position: 1,
      imageUrl: PHOTO.bierIpa,
      vignetteCodes: ["signature"],
      allergeneCodes: ["gluten"],
    });
    await makeProduit({
      categorieId: happyHour.id,
      titre: "Blonde de Garde Artisanale 6.5%",
      description:
        "Bière de garde du Nord, robe dorée, finale ronde et maltée.",
      prix: "4.00",
      prixVariantes: [
        { label: "Demi 25cl", prix: 4.0 },
        { label: "Pinte 50cl", prix: 7.5 },
      ],
      position: 2,
      origine: "FR",
      estNouveau: true,
      imageUrl: PHOTO.blondeGarde,
      vignetteCodes: ["local", "bio"],
      allergeneCodes: ["gluten"],
    });
    await makeProduit({
      categorieId: happyHour.id,
      titre: "Cidre Brut Fermier",
      description: "Cidre AOP du Pays Basque, pomme à cidre 100% locale.",
      prix: "4.00",
      prixVariantes: [
        { label: "Verre 25cl", prix: 4.0 },
        { label: "Bouteille 75cl", prix: 12.0 },
      ],
      position: 3,
      origine: "FR",
      imageUrl: PHOTO.cidre,
      vignetteCodes: ["local", "bio", "sans_gluten"],
    });
    await makeProduit({
      categorieId: happyHour.id,
      titre: "Buckler 0,0% (sans alcool)",
      description: "La bière sans alcool de référence, légère et désaltérante.",
      prix: "5.00",
      descriptionPrix: "33cl",
      position: 4,
      imageUrl: PHOTO.bierSansAlcool,
      vignetteCodes: ["sans_gluten"],
      allergeneCodes: ["gluten"],
    });

    // ============== CATÉGORIE 6 · BOISSONS ==============
    const boissons = await tx.categorie.create({
      data: {
        restaurantId: resto.id,
        titre: "Boissons",
        icone: "coffee",
        position: 5,
      },
    });
    const espresso = await makeProduit({
      categorieId: boissons.id,
      titre: "Café espresso",
      description: "Torréfaction artisanale bordelaise.",
      prix: "2.50",
      position: 0,
      imageUrl: PHOTO.espresso,
      vignetteCodes: ["bio", "local"],
    });
    await makeProduit({
      categorieId: boissons.id,
      titre: "Thé bio (gamme Kusmi)",
      description: "Anastasia, Detox, Rooibos vanille, English Breakfast.",
      prix: "4.00",
      position: 1,
      imageUrl: PHOTO.the,
      vignetteCodes: ["bio"],
    });
    await makeProduit({
      categorieId: boissons.id,
      titre: "Vittel 50cl",
      description: "Eau de source plate.",
      prix: "4.00",
      descriptionPrix: "50cl",
      position: 2,
      imageUrl: PHOTO.vittel,
    });
    await makeProduit({
      categorieId: boissons.id,
      titre: "Jus de pomme bio artisanal",
      description: "Pommes du Périgord, pressées à froid · 25cl.",
      prix: "5.00",
      position: 3,
      origine: "FR",
      imageUrl: PHOTO.jusPomme,
      vignetteCodes: ["local", "bio"],
    });

    // ============== SUGGESTIONS D'ACCOMPAGNEMENT ==============
    // Le tartare suggère un Margaux, la burrata un Spritz, le foie gras un
    // Margaux aussi, le cannelé/café gourmand un espresso. Montre la feature
    // upsell de Ruliz.
    await tx.produitSuggestion.createMany({
      data: [
        { produitId: tartare.id, suggestionId: margaux.id, position: 0 },
        { produitId: tartare.id, suggestionId: cremant.id, position: 1 },
        { produitId: burrata.id, suggestionId: spritz.id, position: 0 },
        { produitId: foieGras.id, suggestionId: margaux.id, position: 0 },
        { produitId: bavette.id, suggestionId: margaux.id, position: 0 },
        { produitId: magret.id, suggestionId: margaux.id, position: 0 },
        { produitId: cannele.id, suggestionId: espresso.id, position: 0 },
        { produitId: cafeGourmand.id, suggestionId: espresso.id, position: 0 },
      ],
    });

    // ============== JEU · ROULETTE D'AVIS GOOGLE ==============
    await tx.jeu.create({
      data: {
        restaurantId: resto.id,
        nom: "Roulette d'avis Google",
        actif: true,
        autoPopup: false,
        autoPopupDelaySec: 5,
        configJson: {
          cta: "Laisse-nous un avis Google et tente ta chance · 1 lot offert à chaque participation !",
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

    // ============== POP-UPS ==============
    // 1. Happy Hour quotidien 18h-20h
    await tx.popup.create({
      data: {
        restaurantId: resto.id,
        titre: "Happy Hour 🍸",
        description:
          "Cocktail maison + tapas du jour à 12€ · tous les jours de 18h à 20h. Le moment idéal pour découvrir notre carte.",
        imageUrl: PHOTO.cocktail,
        ctaLabel: "Voir les apéritifs",
        actif: true,
        heureDebut: "18:00",
        heureFin: "20:00",
      },
    });

    // 2. Brunch dominical (joursActifs bitmap : dimanche = bit 0 = 1)
    await tx.popup.create({
      data: {
        restaurantId: resto.id,
        titre: "Brunch dominical 🥐",
        description:
          "Brunch complet 26€ chaque dimanche de 11h à 14h : viennoiseries, œufs brouillés, charcuterie locale, fromages, fruits frais, jus pressé, café à volonté.",
        imageUrl: PHOTO.brunch,
        ctaLabel: "Réserver une table",
        ctaUrl: "https://ruliz.fr/reservation",
        actif: true,
        joursActifs: 1, // 0b0000001 = dimanche uniquement
        heureDebut: "11:00",
        heureFin: "14:00",
      },
    });

    return resto;
  });
}
