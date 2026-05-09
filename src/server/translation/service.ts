import "server-only";
import { prisma } from "@/lib/db";
import {
  SUPPORTED_LANGS,
  translateProduitFields,
  translateText,
  type SupportedLang,
} from "./anthropic";

/**
 * Translate one produit into one target lang.
 * Idempotent : skips work if translation already exists in DB.
 */
export async function translateProduitToLang(opts: {
  produitId: bigint;
  targetLang: SupportedLang;
  /** Si true, ignore le cache DB et force une nouvelle traduction. */
  force?: boolean;
  /** Langue source (langueNative du resto). Default fr pour rétrocompat. */
  sourceLang?: SupportedLang;
}): Promise<{ ok: boolean }> {
  const { produitId, targetLang, force, sourceLang } = opts;

  // Skip if already cached (sauf si force)
  if (!force) {
    const existing = await prisma.produitTranslation.findUnique({
      where: { produitId_lang: { produitId, lang: targetLang } },
    });
    if (existing) return { ok: true };
  }

  const produit = await prisma.produit.findUnique({
    where: { id: produitId },
    select: {
      titre: true,
      description: true,
      descriptionPrix: true,
      titreRemarque: true,
      descriptionRemarque: true,
      origine: true,
    },
  });
  if (!produit) return { ok: false };

  const result = await translateProduitFields({
    titre: produit.titre,
    description: produit.description,
    descriptionPrix: produit.descriptionPrix,
    titreRemarque: produit.titreRemarque,
    descriptionRemarque: produit.descriptionRemarque,
    origine: produit.origine,
    targetLang,
    sourceLang,
  });

  if (!result.ok) {
    console.error(`[translation] produit ${produitId} → ${targetLang}: ${result.error}`);
    return { ok: false };
  }

  await prisma.produitTranslation.upsert({
    where: { produitId_lang: { produitId, lang: targetLang } },
    create: {
      produitId,
      lang: targetLang,
      titre: result.titre,
      description: result.description,
      descriptionPrix: result.descriptionPrix,
      titreRemarque: result.titreRemarque,
      descriptionRemarque: result.descriptionRemarque,
      origine: result.origine,
      source: "anthropic",
    },
    update: {
      titre: result.titre,
      description: result.description,
      descriptionPrix: result.descriptionPrix,
      titreRemarque: result.titreRemarque,
      descriptionRemarque: result.descriptionRemarque,
      origine: result.origine,
      source: "anthropic",
      translatedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function translateCategorieToLang(opts: {
  categorieId: bigint;
  targetLang: SupportedLang;
  /** Si true, ignore le cache DB et force une nouvelle traduction. */
  force?: boolean;
  /** Langue source (langueNative du resto). */
  sourceLang?: SupportedLang;
}): Promise<{ ok: boolean }> {
  const { categorieId, targetLang, force, sourceLang } = opts;

  if (!force) {
    const existing = await prisma.categorieTranslation.findUnique({
      where: { categorieId_lang: { categorieId, lang: targetLang } },
    });
    if (existing) return { ok: true };
  }

  const cat = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: { titre: true },
  });
  if (!cat) return { ok: false };

  const result = await translateText({
    text: cat.titre,
    targetLang,
    sourceLang: sourceLang ?? "fr",
  });

  if (!result.ok) {
    console.error(`[translation] categorie ${categorieId} → ${targetLang}: ${result.error}`);
    return { ok: false };
  }

  await prisma.categorieTranslation.upsert({
    where: { categorieId_lang: { categorieId, lang: targetLang } },
    create: {
      categorieId,
      lang: targetLang,
      titre: result.text,
    },
    update: {
      titre: result.text,
    },
  });
  return { ok: true };
}

/**
 * Translate the entire menu of a restaurant to all target langs (excluding 'fr').
 * Designed to be called from a background worker (Inngest).
 */
export async function translateRestaurantMenu(opts: {
  restaurantId: bigint;
  langs?: SupportedLang[];
  /** Si true, ignore le cache DB et force la re-traduction de tout. */
  force?: boolean;
}): Promise<{ produits: number; categories: number }> {
  // Récupère la langue native du resto pour partir de là (au lieu de FR forcé)
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { langueNative: true },
  });
  const sourceLang = (restaurant?.langueNative ?? "fr") as SupportedLang;

  const langs = (opts.langs ?? SUPPORTED_LANGS).filter((l) => l !== sourceLang);

  const [categories, produits] = await Promise.all([
    prisma.categorie.findMany({
      where: { restaurantId: opts.restaurantId },
      select: { id: true },
    }),
    prisma.produit.findMany({
      where: { categorie: { restaurantId: opts.restaurantId } },
      select: { id: true },
    }),
  ]);

  let categoriesCount = 0;
  let produitsCount = 0;

  // Run sequentially per (item, lang) to keep API rate-limit safe.
  for (const lang of langs) {
    for (const c of categories) {
      const r = await translateCategorieToLang({
        categorieId: c.id,
        targetLang: lang,
        force: opts.force,
        sourceLang,
      });
      if (r.ok) categoriesCount += 1;
    }
    for (const p of produits) {
      const r = await translateProduitToLang({
        produitId: p.id,
        targetLang: lang,
        force: opts.force,
        sourceLang,
      });
      if (r.ok) produitsCount += 1;
    }
  }

  return { produits: produitsCount, categories: categoriesCount };
}
