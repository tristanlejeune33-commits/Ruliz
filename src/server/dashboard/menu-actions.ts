"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { inngest } from "@/server/inngest/client";
import { SUPPORTED_LANGS } from "@/lib/langs";

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
      // silent — c'est OK si Inngest n'est pas configuré
    });
}

/** Invalide les translations du produit (re-traduction par Inngest worker). */
async function invalidateProduitTranslations(produitId: bigint) {
  await prisma.produitTranslation.deleteMany({ where: { produitId } });
}

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

  // Invalide les traductions existantes — Inngest re-traduira en background.
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

const produitSchema = z.object({
  categorieId: z.string(),
  titre: z.string().min(1).max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  prix: z.union([z.number().nonnegative(), z.literal("")]).optional(),
  devise: z.string().max(5).default("€"),
  descriptionPrix: z.string().max(255).optional().or(z.literal("")),
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

  const created = await prisma.produit.create({
    data: {
      categorieId: catId,
      titre: data.titre,
      description: emptyToNull(data.description),
      imageUrl: emptyToNull(data.imageUrl),
      prix: decimalOrNull(data.prix),
      devise: data.devise || "€",
      descriptionPrix: emptyToNull(data.descriptionPrix),
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
    },
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
        estNouveau: data.estNouveau,
        origine: emptyToNull(data.origine),
        titreRemarque: emptyToNull(data.titreRemarque),
        descriptionRemarque: emptyToNull(data.descriptionRemarque),
        scheduleType: data.scheduleType ?? "always",
        scheduleStart: emptyToNull(data.scheduleStart),
        scheduleEnd: emptyToNull(data.scheduleEnd),
        scheduleDays: data.scheduleDays ?? "1234567",
      },
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
