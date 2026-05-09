import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { SupportedLang } from "@/lib/langs";

export { isSupportedLang } from "@/lib/langs";

const CACHE_TTL_SECONDS = 60 * 30; // 30 min Redis cache (ISR layer above is 60s)

export type PublicMenu = {
  restaurant: {
    id: string;
    nom: string;
    description: string | null;
    logoUrl: string | null;
    banniereUrl: string | null;
    /** Devise par défaut affichée si un produit n'a pas la sienne. */
    deviseDefault: string;
    /** light | dark */
    theme: "light" | "dark";
    /** modern | editorial | elegant — pilote le choix de typo display. */
    fontStyle: "modern" | "editorial" | "elegant";
    /** Couleur d'accent (CTA, boutons). */
    couleurPrimaire: string | null;
    couleurSecondaire: string | null;
    /** Couleur de fond de la carte. */
    couleurFond: string | null;
    /** Couleur du titre du restaurant. */
    couleurTexteTitre: string | null;
    /** Couleur des titres de catégories. */
    couleurCategorie: string | null;
    ville: string | null;
    pays: string | null;
    adresse: string | null;
    codePostal: string | null;
    telephone: string | null;
    email: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    siteWeb: string | null;
    googleReviewUrl: string | null;
    plan: "freemium" | "pro" | "premium";
  };
  /** Jeu roulette actif si configuré. */
  jeu: {
    id: string;
    cta: string;
    lots: Array<{ label: string; probabilite: number }>;
    requireGoogleReview: boolean;
  } | null;
  /** Pop-up actif à la date courante. */
  popup: {
    id: string;
    titre: string;
    description: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  } | null;
  lang: SupportedLang;
  /** True if at least one fallback (FR) was used because translation is missing. */
  partiallyTranslated: boolean;
  categories: Array<{
    id: string;
    titre: string;
    icone: string | null;
    modeAffichage: "liste" | "grille" | "carrousel";
    produits: Array<{
      id: string;
      titre: string;
      description: string | null;
      descriptionPrix: string | null;
      imageUrl: string | null;
      prix: number | null;
      devise: string;
      estNouveau: boolean;
      origine: string | null;
      titreRemarque: string | null;
      descriptionRemarque: string | null;
      vignettes: Array<{ code: string; labelFr: string; icone: string | null }>;
      allergenes: Array<{ code: string; labelFr: string }>;
      suggestionsIds: string[];
    }>;
  }>;
};

function cacheKey(restaurantId: bigint | string, lang: SupportedLang) {
  return `carte:${restaurantId.toString()}:${lang}`;
}

/**
 * Loads the menu of a restaurant, translated to `lang`, with 4-level cache:
 *   L1 Cloudflare (HTTP edge) — handled in route headers
 *   L2 Next ISR — handled by `revalidate` in the page
 *   L3 Redis — handled here (`carte:{id}:{lang}`)
 *   L4 DB cache — `produit_translations` and `categorie_translations`
 *
 * If a translation is missing for some product/categorie, fall back to FR
 * and flag `partiallyTranslated`. The Inngest worker fills the gaps async.
 */
export async function getPublicMenu(
  restaurantId: bigint,
  lang: SupportedLang,
): Promise<PublicMenu | null> {
  // L3 Redis lookup
  if (redis) {
    try {
      const cached = await redis.get(cacheKey(restaurantId, lang));
      if (cached) {
        return JSON.parse(cached) as PublicMenu;
      }
    } catch (e) {
      console.warn("[redis] read failed:", e);
    }
  }

  // L4 DB query with translations
  const [restaurant, jeuRow, popupRow] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        nom: true,
        description: true,
        logoUrl: true,
        banniereUrl: true,
        deviseDefault: true,
        theme: true,
        fontStyle: true,
        couleurPrimaire: true,
        couleurSecondaire: true,
        couleurFond: true,
        couleurTexteTitre: true,
        couleurCategorie: true,
        ville: true,
        pays: true,
        adresse: true,
        codePostal: true,
        telephone: true,
        email: true,
        facebookUrl: true,
        instagramUrl: true,
        tiktokUrl: true,
        siteWeb: true,
        googleReviewUrl: true,
        plan: true,
      },
    }),
    prisma.jeu.findFirst({
      where: { restaurantId, actif: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.popup.findFirst({
      where: {
        restaurantId,
        actif: true,
        OR: [
          { dateDebut: null, dateFin: null },
          { dateDebut: { lte: new Date() }, dateFin: { gte: new Date() } },
          { dateDebut: { lte: new Date() }, dateFin: null },
          { dateDebut: null, dateFin: { gte: new Date() } },
        ],
      },
      orderBy: { id: "desc" },
    }),
  ]);
  if (!restaurant) return null;

  type JeuConfigShape = {
    cta?: string;
    lots?: Array<{ label: string; probabilite: number }>;
    require_google_review?: boolean;
  };
  const jeuConfig = (jeuRow?.configJson as unknown as JeuConfigShape | null) ?? null;
  const jeu =
    jeuRow && jeuConfig?.lots && jeuConfig.lots.length > 0
      ? {
          id: jeuRow.id.toString(),
          cta: jeuConfig.cta ?? "",
          lots: jeuConfig.lots,
          requireGoogleReview: jeuConfig.require_google_review ?? false,
        }
      : null;

  const popup = popupRow
    ? {
        id: popupRow.id.toString(),
        titre: popupRow.titre ?? "",
        description: popupRow.description,
        imageUrl: popupRow.imageUrl,
        ctaLabel: popupRow.ctaLabel,
        ctaUrl: popupRow.ctaUrl,
      }
    : null;

  const categoriesRaw = await prisma.categorie.findMany({
    where: {
      restaurantId,
      affiche: true,
      parentId: null,
    },
    orderBy: { position: "asc" },
    include: {
      produits: {
        where: { statut: "affiche" },
        orderBy: { position: "asc" },
        include: {
          vignettes: { include: { vignette: true } },
          allergenes: { include: { allergene: true } },
          suggestionsIn: { orderBy: { position: "asc" } },
          translations: lang === "fr" ? false : { where: { lang } },
        },
      },
      translations: lang === "fr" ? false : { where: { lang } },
    },
  });

  let partiallyTranslated = false;

  const categories: PublicMenu["categories"] = categoriesRaw.map((cat) => {
    const catTitre =
      lang !== "fr" && cat.translations && cat.translations[0]?.titre
        ? cat.translations[0].titre
        : cat.titre;
    if (lang !== "fr" && (!cat.translations || cat.translations.length === 0)) {
      partiallyTranslated = true;
    }

    return {
      id: cat.id.toString(),
      titre: catTitre,
      icone: cat.icone,
      modeAffichage: cat.modeAffichage,
      produits: cat.produits.map((p) => {
        const trad = lang !== "fr" ? p.translations?.[0] : undefined;
        if (lang !== "fr" && !trad) partiallyTranslated = true;

        return {
          id: p.id.toString(),
          titre: trad?.titre ?? p.titre,
          description: trad?.description ?? p.description,
          descriptionPrix: trad?.descriptionPrix ?? p.descriptionPrix,
          imageUrl: p.imageUrl,
          prix: p.prix !== null ? Number(p.prix) : null,
          devise: p.devise ?? "€",
          estNouveau: p.estNouveau,
          origine: p.origine,
          titreRemarque: p.titreRemarque,
          descriptionRemarque: p.descriptionRemarque,
          vignettes: p.vignettes.map((v) => ({
            code: v.vignette.code,
            labelFr: v.vignette.labelFr,
            icone: v.vignette.icone,
          })),
          allergenes: p.allergenes.map((a) => ({
            code: a.allergene.code,
            labelFr: a.allergene.labelFr,
          })),
          suggestionsIds: p.suggestionsIn.map((s) => s.suggestionId.toString()),
        };
      }),
    };
  });

  const menu: PublicMenu = {
    restaurant: {
      id: restaurant.id.toString(),
      nom: restaurant.nom,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      banniereUrl: restaurant.banniereUrl,
      deviseDefault: restaurant.deviseDefault ?? "€",
      theme: (restaurant.theme as "light" | "dark") ?? "light",
      fontStyle:
        (restaurant.fontStyle as "modern" | "editorial" | "elegant") ?? "editorial",
      couleurPrimaire: restaurant.couleurPrimaire,
      couleurSecondaire: restaurant.couleurSecondaire,
      couleurFond: restaurant.couleurFond,
      couleurTexteTitre: restaurant.couleurTexteTitre,
      couleurCategorie: restaurant.couleurCategorie,
      ville: restaurant.ville,
      pays: restaurant.pays,
      adresse: restaurant.adresse,
      codePostal: restaurant.codePostal,
      telephone: restaurant.telephone,
      email: restaurant.email,
      facebookUrl: restaurant.facebookUrl,
      instagramUrl: restaurant.instagramUrl,
      tiktokUrl: restaurant.tiktokUrl,
      siteWeb: restaurant.siteWeb,
      googleReviewUrl: restaurant.googleReviewUrl,
      plan: restaurant.plan,
    },
    jeu,
    popup,
    lang,
    partiallyTranslated,
    categories,
  };

  // Write to Redis (best-effort, don't block response)
  if (redis) {
    redis
      .set(cacheKey(restaurantId, lang), JSON.stringify(menu), "EX", CACHE_TTL_SECONDS)
      .catch((e) => console.warn("[redis] write failed:", e));
  }

  return menu;
}

/**
 * Fast existence check for ISR generateStaticParams.
 */
export async function listPublishableRestaurantIds(): Promise<string[]> {
  const list = await prisma.restaurant.findMany({
    where: { statut: "actif", plan: { in: ["pro", "premium"] } },
    select: { id: true },
  });
  return list.map((r) => r.id.toString());
}
