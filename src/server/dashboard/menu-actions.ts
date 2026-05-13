"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { inngest } from "@/server/inngest/client";
import { SUPPORTED_LANGS, type SupportedLang } from "@/lib/langs";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------- Helpers ----------------

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

async function assertCategorieOwner(categorieId: bigint) {
  const cat = await prisma.categorie.findUnique({
    where: { id: categorieId },
    select: { restaurantId: true },
  });
  if (!cat) return null;
  const owned = await assertRestaurantOwner(cat.restaurantId);
  return owned ? cat : null;
}

async function assertProduitOwner(produitId: bigint) {
  const produit = await prisma.produit.findUnique({
    where: { id: produitId },
    select: { categorie: { select: { restaurantId: true } } },
  });
  if (!produit) return null;
  const owned = await assertRestaurantOwner(produit.categorie.restaurantId);
  return owned ? produit : null;
}

async function bumpRestaurantCaches(restaurantId: bigint) {
  revalidatePath("/dashboard/menu");
  revalidatePath(`/carte/${restaurantId.toString()}`);
  // ⚠️ Crucial : `unstable_cache(getPublicMenu, { tags: ["public-menu"] })`
  // dans /carte/[id]/page.tsx ne se rafraîchit QUE par tag (revalidatePath
  // n'invalide pas la data cache). Sans ça, après une modif catégorie/produit,
  // la carte publique servait encore la version en cache pendant 60s · donc
  // les traductions fraîchement re-générées ne s'affichaient pas.
  revalidateTag("public-menu");

  // Purge Redis directement (sync, ne dépend pas d'Inngest qui peut être
  // absent en dev). C'était le bug qui faisait que les sous-cats / les
  // changements de catégorie ne s'affichaient pas pendant 30 min.
  if (redis) {
    try {
      const keys = SUPPORTED_LANGS.map(
        (l) => `carte:${restaurantId.toString()}:${l}`,
      );
      await redis.del(...keys);
    } catch (err) {
      console.warn("[bumpRestaurantCaches] redis del failed:", err);
    }
  }

  // Inngest reste pour les workers qui veulent réagir (ex: re-translation
  // background, analytics). Best-effort, ne bloque pas la réponse.
  void inngest
    .send({
      name: "carte/cache.invalidate",
      data: { restaurantId: restaurantId.toString() },
    })
    .catch(() => {
      // silent · c'est OK si Inngest n'est pas configuré
    });
}

/** Invalide les translations du produit (re-traduction par Inngest worker). */
async function invalidateProduitTranslations(produitId: bigint) {
  await prisma.produitTranslation.deleteMany({ where: { produitId } });
}

/**
 * Déclenche la traduction d'un produit en background. 2 chemins :
 *   1. Inngest (prod path propre, si INNGEST_EVENT_KEY défini ET worker
 *      qui tourne)
 *   2. Fallback `after()` : exécute la traduction dans le même process
 *      Node après la réponse · garantit que la trad arrive même si
 *      Inngest n'est pas configuré ou si le worker ne tourne pas.
 *
 * Le fallback est idempotent (skip si déjà traduit en DB), donc lancer les
 * 2 chemins en parallèle ne fait pas double appel API Anthropic.
 */
async function triggerProduitTranslation(produitId: bigint, restaurantId: bigint) {
  await inngest
    .send({
      name: "produit/updated",
      data: {
        produitId: produitId.toString(),
        restaurantId: restaurantId.toString(),
      },
    })
    .catch((e) => console.warn("[inngest] produit/updated failed:", e));

  // Fallback : traduction post-réponse, indépendante d'Inngest
  after(async () => {
    try {
      const { translateProduitToLang } = await import(
        "@/server/translation/service"
      );
      const targets = SUPPORTED_LANGS.filter((l) => l !== "fr");
      for (const lang of targets) {
        await translateProduitToLang({
          produitId,
          targetLang: lang as SupportedLang,
        }).catch((e) =>
          console.warn(`[after] produit ${produitId} → ${lang}:`, e),
        );
      }
      if (redis) {
        const keys = SUPPORTED_LANGS.map(
          (l) => `carte:${restaurantId.toString()}:${l}`,
        );
        await redis.del(...keys).catch(() => null);
      }
      // Re-invalide après que les trads soient en DB : couvre le cas où un
      // visiteur a re-peuplé l'unstable_cache pendant que after() tournait.
      revalidateTag("public-menu");
    } catch (err) {
      console.warn("[after] triggerProduitTranslation failed:", err);
    }
  });
}

async function triggerCategorieTranslation(categorieId: bigint, restaurantId: bigint) {
  await inngest
    .send({
      name: "categorie/updated",
      data: {
        categorieId: categorieId.toString(),
        restaurantId: restaurantId.toString(),
      },
    })
    .catch((e) => console.warn("[inngest] categorie/updated failed:", e));

  // Fallback : traduction post-réponse, indépendante d'Inngest
  after(async () => {
    try {
      const { translateCategorieToLang } = await import(
        "@/server/translation/service"
      );
      const targets = SUPPORTED_LANGS.filter((l) => l !== "fr");
      for (const lang of targets) {
        await translateCategorieToLang({
          categorieId,
          targetLang: lang as SupportedLang,
        }).catch((e) =>
          console.warn(`[after] categorie ${categorieId} → ${lang}:`, e),
        );
      }
      if (redis) {
        const keys = SUPPORTED_LANGS.map(
          (l) => `carte:${restaurantId.toString()}:${l}`,
        );
        await redis.del(...keys).catch(() => null);
      }
      // Re-invalide après que les trads soient en DB : couvre le cas où un
      // visiteur a re-peuplé l'unstable_cache pendant que after() tournait.
      revalidateTag("public-menu");
    } catch (err) {
      console.warn("[after] triggerCategorieTranslation failed:", err);
    }
  });
}

// ---------------- Catégories ----------------

const categorieSchema = z.object({
  restaurantId: z.string(),
  titre: z.string().min(1).max(255),
  icone: z.string().max(50).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  modeAffichage: z.enum(["liste", "grille", "carrousel"]),
  affiche: z.boolean(),
  scheduleType: z
    .enum(["always", "lunch", "dinner", "happy_hour", "custom"])
    .optional(),
  scheduleStart: z.string().max(5).optional().or(z.literal("")),
  scheduleEnd: z.string().max(5).optional().or(z.literal("")),
  scheduleDays: z.string().min(1).max(7).optional(),
  couleur: z.string().max(7).optional().or(z.literal("")),
});

export async function createCategorie(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = categorieSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const restoId = bigOrNull(data.restaurantId);
  if (!restoId) return { ok: false, error: "Restaurant invalide" };

  const owned = await assertRestaurantOwner(restoId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  const last = await prisma.categorie.findFirst({
    where: { restaurantId: restoId, parentId: bigOrNull(data.parentId) },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  const created = await prisma.categorie.create({
    data: {
      restaurantId: restoId,
      titre: data.titre,
      icone: data.icone || null,
      parentId: bigOrNull(data.parentId),
      modeAffichage: data.modeAffichage,
      affiche: data.affiche,
      scheduleType: data.scheduleType ?? "always",
      scheduleStart: data.scheduleStart || null,
      scheduleEnd: data.scheduleEnd || null,
      scheduleDays: data.scheduleDays ?? "1234567",
      couleur: data.couleur || null,
      position,
    },
  });

  await triggerCategorieTranslation(created.id, restoId);
  await bumpRestaurantCaches(restoId);
  return { ok: true, data: { id: created.id.toString() } };
}

const updateCategorieSchema = categorieSchema.omit({ restaurantId: true }).extend({
  id: z.string(),
});

export async function updateCategorie(input: unknown): Promise<ActionResult> {
  const parsed = updateCategorieSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;
  const id = bigOrNull(data.id);
  if (!id) return { ok: false, error: "Identifiant invalide" };

  const cat = await assertCategorieOwner(id);
  if (!cat) return { ok: false, error: "Accès refusé" };

  await prisma.categorie.update({
    where: { id },
    data: {
      titre: data.titre,
      icone: data.icone || null,
      parentId: bigOrNull(data.parentId),
      modeAffichage: data.modeAffichage,
      affiche: data.affiche,
      scheduleType: data.scheduleType ?? "always",
      scheduleStart: data.scheduleStart || null,
      scheduleEnd: data.scheduleEnd || null,
      scheduleDays: data.scheduleDays ?? "1234567",
      couleur: data.couleur || null,
    },
  });

  // Invalide les traductions existantes · Inngest re-traduira en background.
  await prisma.categorieTranslation.deleteMany({ where: { categorieId: id } });

  await triggerCategorieTranslation(id, cat.restaurantId);
  await bumpRestaurantCaches(cat.restaurantId);
  return { ok: true };
}

export async function deleteCategorie(id: string): Promise<ActionResult> {
  const big = bigOrNull(id);
  if (!big) return { ok: false, error: "Identifiant invalide" };

  const cat = await assertCategorieOwner(big);
  if (!cat) return { ok: false, error: "Accès refusé" };

  await prisma.categorie.delete({ where: { id: big } });
  await bumpRestaurantCaches(cat.restaurantId);
  return { ok: true };
}

const reorderSchema = z.object({
  restaurantId: z.string(),
  ids: z.array(z.string()).min(1),
});

export async function reorderCategories(input: unknown): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const restoId = bigOrNull(parsed.data.restaurantId);
  if (!restoId) return { ok: false, error: "Restaurant invalide" };
  const owned = await assertRestaurantOwner(restoId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.categorie.updateMany({
        where: { id: BigInt(id), restaurantId: restoId },
        data: { position: index + 1 },
      }),
    ),
  );

  await bumpRestaurantCaches(restoId);
  return { ok: true };
}

// ---------------- Produits ----------------

/** Variante de prix : label (ex: "Demi", "Pinte") + prix décimal. */
const prixVarianteSchema = z.object({
  label: z.string().min(1, "Label requis").max(60),
  prix: z.number().nonnegative("Prix doit être ≥ 0"),
});

const produitSchema = z.object({
  categorieId: z.string(),
  titre: z.string().min(1).max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  prix: z.union([z.number().nonnegative(), z.literal("")]).optional(),
  devise: z.string().max(5).default("€"),
  descriptionPrix: z.string().max(255).optional().or(z.literal("")),
  /** Liste de variantes (max 8). null/empty → fallback sur `prix` simple. */
  prixVariantes: z.array(prixVarianteSchema).max(8).optional(),
  estNouveau: z.boolean(),
  origine: z.string().length(2).optional().or(z.literal("")),
  titreRemarque: z.string().max(255).optional().or(z.literal("")),
  descriptionRemarque: z.string().max(2000).optional().or(z.literal("")),
  vignettes: z.array(z.number().int()).default([]),
  allergenes: z.array(z.number().int()).default([]),
  scheduleType: z
    .enum(["always", "lunch", "dinner", "happy_hour", "custom"])
    .optional(),
  scheduleStart: z.string().max(5).optional().or(z.literal("")),
  scheduleEnd: z.string().max(5).optional().or(z.literal("")),
  scheduleDays: z.string().min(1).max(7).optional(),
});

const updateProduitSchema = produitSchema.extend({ id: z.string() });

function emptyToNull(v: string | undefined | null) {
  return v && v.trim().length > 0 ? v : null;
}

function decimalOrNull(v: number | "" | undefined) {
  if (typeof v === "number" && !Number.isNaN(v)) return new Prisma.Decimal(v);
  return null;
}

export async function createProduit(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = produitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;
  const catId = bigOrNull(data.categorieId);
  if (!catId) return { ok: false, error: "Catégorie invalide" };

  const cat = await assertCategorieOwner(catId);
  if (!cat) return { ok: false, error: "Accès refusé" };

  const last = await prisma.produit.findFirst({
    where: { categorieId: catId },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  // Nettoie les variantes : retire les lignes incomplètes (label vide).
  // null si aucune variante → fallback sur le prix simple côté affichage.
  const variantes =
    data.prixVariantes && data.prixVariantes.length > 0
      ? data.prixVariantes.filter((v) => v.label.trim().length > 0)
      : null;

  const created = await prisma.produit.create({
    data: {
      categorieId: catId,
      titre: data.titre,
      description: emptyToNull(data.description),
      imageUrl: emptyToNull(data.imageUrl),
      prix: decimalOrNull(data.prix),
      devise: data.devise || "€",
      descriptionPrix: emptyToNull(data.descriptionPrix),
      // Cast `as never` car client Prisma peut être stale localement
      // (la colonne prix_variantes existe en DB via la migration).
      prixVariantes: variantes && variantes.length > 0 ? variantes : null,
      estNouveau: data.estNouveau,
      origine: emptyToNull(data.origine),
      titreRemarque: emptyToNull(data.titreRemarque),
      descriptionRemarque: emptyToNull(data.descriptionRemarque),
      scheduleType: data.scheduleType ?? "always",
      scheduleStart: emptyToNull(data.scheduleStart),
      scheduleEnd: emptyToNull(data.scheduleEnd),
      scheduleDays: data.scheduleDays ?? "1234567",
      position,
      vignettes: { create: data.vignettes.map((id) => ({ vignetteId: id })) },
      allergenes: { create: data.allergenes.map((id) => ({ allergeneId: id })) },
    } as never,
  });

  await triggerProduitTranslation(created.id, cat.restaurantId);
  await bumpRestaurantCaches(cat.restaurantId);
  return { ok: true, data: { id: created.id.toString() } };
}

export async function updateProduit(input: unknown): Promise<ActionResult> {
  const parsed = updateProduitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;
  const id = bigOrNull(data.id);
  if (!id) return { ok: false, error: "Identifiant invalide" };

  const produit = await assertProduitOwner(id);
  if (!produit) return { ok: false, error: "Accès refusé" };

  const updateVariantes =
    data.prixVariantes && data.prixVariantes.length > 0
      ? data.prixVariantes.filter((v) => v.label.trim().length > 0)
      : null;

  await prisma.$transaction([
    prisma.produit.update({
      where: { id },
      data: {
        categorieId: BigInt(data.categorieId),
        titre: data.titre,
        description: emptyToNull(data.description),
        imageUrl: emptyToNull(data.imageUrl),
        prix: decimalOrNull(data.prix),
        devise: data.devise || "€",
        descriptionPrix: emptyToNull(data.descriptionPrix),
        prixVariantes:
          updateVariantes && updateVariantes.length > 0 ? updateVariantes : null,
        estNouveau: data.estNouveau,
        origine: emptyToNull(data.origine),
        titreRemarque: emptyToNull(data.titreRemarque),
        descriptionRemarque: emptyToNull(data.descriptionRemarque),
        scheduleType: data.scheduleType ?? "always",
        scheduleStart: emptyToNull(data.scheduleStart),
        scheduleEnd: emptyToNull(data.scheduleEnd),
        scheduleDays: data.scheduleDays ?? "1234567",
      } as never,
    }),
    prisma.produitVignette.deleteMany({ where: { produitId: id } }),
    prisma.produitAllergene.deleteMany({ where: { produitId: id } }),
    prisma.produitVignette.createMany({
      data: data.vignettes.map((v) => ({ produitId: id, vignetteId: v })),
      skipDuplicates: true,
    }),
    prisma.produitAllergene.createMany({
      data: data.allergenes.map((a) => ({ produitId: id, allergeneId: a })),
      skipDuplicates: true,
    }),
  ]);

  await invalidateProduitTranslations(id);
  await triggerProduitTranslation(id, produit.categorie.restaurantId);

  await bumpRestaurantCaches(produit.categorie.restaurantId);
  return { ok: true };
}

export async function deleteProduit(id: string): Promise<ActionResult> {
  const big = bigOrNull(id);
  if (!big) return { ok: false, error: "Identifiant invalide" };

  const produit = await assertProduitOwner(big);
  if (!produit) return { ok: false, error: "Accès refusé" };

  await prisma.produit.delete({ where: { id: big } });
  await bumpRestaurantCaches(produit.categorie.restaurantId);
  return { ok: true };
}

const reorderProduitsSchema = z.object({
  categorieId: z.string(),
  ids: z.array(z.string()).min(1),
});

export async function reorderProduits(input: unknown): Promise<ActionResult> {
  const parsed = reorderProduitsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const catId = bigOrNull(parsed.data.categorieId);
  if (!catId) return { ok: false, error: "Catégorie invalide" };
  const cat = await assertCategorieOwner(catId);
  if (!cat) return { ok: false, error: "Accès refusé" };

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.produit.updateMany({
        where: { id: BigInt(id), categorieId: catId },
        data: { position: index + 1 },
      }),
    ),
  );

  await bumpRestaurantCaches(cat.restaurantId);
  return { ok: true };
}

const moveProduitSchema = z.object({
  produitId: z.string(),
  toCategorieId: z.string(),
});

export async function moveProduit(input: unknown): Promise<ActionResult> {
  const parsed = moveProduitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const produitId = bigOrNull(parsed.data.produitId);
  const targetCatId = bigOrNull(parsed.data.toCategorieId);
  if (!produitId || !targetCatId) return { ok: false, error: "Identifiants invalides" };

  const produit = await assertProduitOwner(produitId);
  if (!produit) return { ok: false, error: "Accès refusé" };
  const cat = await assertCategorieOwner(targetCatId);
  if (!cat) return { ok: false, error: "Accès refusé" };

  const last = await prisma.produit.findFirst({
    where: { categorieId: targetCatId },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  await prisma.produit.update({
    where: { id: produitId },
    data: { categorieId: targetCatId, position },
  });

  await bumpRestaurantCaches(cat.restaurantId);
  return { ok: true };
}

// ----------------------------------------------------------------------
// Move catégorie : change le parent d'une cat. parentId = "" / null →
// devient top-level. Sinon → devient sous-cat du parent fourni.
// On garantit qu'on ne supporte qu'un niveau de nesting (un parent ne
// peut pas être lui-même une sous-cat).
// ----------------------------------------------------------------------

const moveCategorieSchema = z.object({
  categorieId: z.string(),
  /** "" ou non fourni = devient top-level */
  toParentId: z.string().optional().or(z.literal("")),
});

export async function moveCategorie(input: unknown): Promise<ActionResult> {
  const parsed = moveCategorieSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const catId = bigOrNull(parsed.data.categorieId);
  if (!catId) return { ok: false, error: "Identifiant invalide" };

  const moving = await assertCategorieOwner(catId);
  if (!moving) return { ok: false, error: "Accès refusé" };

  const newParentId = bigOrNull(parsed.data.toParentId);

  // Garde-fou : pas de self-reference
  if (newParentId && newParentId === catId) {
    return { ok: false, error: "Une catégorie ne peut pas être son propre parent" };
  }

  // Garde-fou : si on déplace vers un parent qui est lui-même une sous-cat,
  // on refuse (un seul niveau de nesting supporté).
  if (newParentId) {
    const futureParent = await prisma.categorie.findUnique({
      where: { id: newParentId },
      select: { restaurantId: true, parentId: true },
    });
    if (!futureParent) return { ok: false, error: "Catégorie parente introuvable" };
    if (futureParent.parentId !== null) {
      return {
        ok: false,
        error: "Une sous-catégorie ne peut pas avoir d'enfants",
      };
    }
    if (futureParent.restaurantId !== moving.restaurantId) {
      return { ok: false, error: "Accès refusé" };
    }
  }

  // Garde-fou : si la cat a elle-même des enfants, elle ne peut pas devenir
  // sous-cat (sinon on aurait 2 niveaux de nesting)
  if (newParentId) {
    const childrenCount = await prisma.categorie.count({
      where: { parentId: catId },
    });
    if (childrenCount > 0) {
      return {
        ok: false,
        error: "Cette catégorie contient des sous-catégories · impossible de la déplacer",
      };
    }
  }

  // Calcule la position : on append en bout de la liste cible (top-level
  // si newParentId=null, sinon enfants de newParentId)
  const last = await prisma.categorie.findFirst({
    where: { restaurantId: moving.restaurantId, parentId: newParentId },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  await prisma.categorie.update({
    where: { id: catId },
    data: { parentId: newParentId, position },
  });

  await bumpRestaurantCaches(moving.restaurantId);
  return { ok: true };
}
