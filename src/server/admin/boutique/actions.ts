"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ----------------------------------------------------------------------------
// Produits CRUD
// ----------------------------------------------------------------------------

const produitSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(255),
  slug: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  prixCentimes: z.number().int().nonnegative(),
  devise: z.string().max(3).default("EUR"),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  categorie: z.string().max(100).optional().or(z.literal("")),
  position: z.number().int().nonnegative().default(0),
  statut: z.enum(["brouillon", "publie", "archive"]).default("brouillon"),
  /** Stock max : null = illimité, sinon entier ≥ 0 */
  stockMax: z.number().int().nonnegative().nullable().optional(),
  /** Liste libre de features (ex: "100 unités", "Format A4") */
  features: z.array(z.string().max(120)).max(20).optional(),
});

export async function createBoutiqueProduit(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = produitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;
  const slug = data.slug?.trim() || slugify(data.nom);

  // Vérifie unicité du slug
  const existing = await prisma.boutiqueProduit.findUnique({ where: { slug } });
  if (existing) {
    return {
      ok: false,
      error: `Un produit avec le slug "${slug}" existe déjà — choisis-en un autre.`,
    };
  }

  const created = await prisma.boutiqueProduit.create({
    data: {
      slug,
      nom: data.nom,
      description: data.description || null,
      prixCentimes: data.prixCentimes,
      devise: data.devise,
      imageUrl: data.imageUrl || null,
      categorie: data.categorie || null,
      position: data.position,
      statut: data.statut,
      stockMax: data.stockMax ?? null,
      featuresJson: data.features ?? [],
    },
  });

  revalidatePath("/admin/boutique");
  revalidatePath("/dashboard/boutique");
  return { ok: true, data: { id: created.id.toString() } };
}

const updateProduitSchema = produitSchema.extend({
  id: z.string(),
});

export async function updateBoutiqueProduit(
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateProduitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;
  const id = bigOrNull(data.id);
  if (!id) return { ok: false, error: "Identifiant invalide" };

  const slug = data.slug?.trim() || slugify(data.nom);

  // Vérifie unicité du slug (sauf pour le produit lui-même)
  const existing = await prisma.boutiqueProduit.findUnique({ where: { slug } });
  if (existing && existing.id !== id) {
    return {
      ok: false,
      error: `Un produit avec le slug "${slug}" existe déjà.`,
    };
  }

  await prisma.boutiqueProduit.update({
    where: { id },
    data: {
      slug,
      nom: data.nom,
      description: data.description || null,
      prixCentimes: data.prixCentimes,
      devise: data.devise,
      imageUrl: data.imageUrl || null,
      categorie: data.categorie || null,
      position: data.position,
      statut: data.statut,
      stockMax: data.stockMax ?? null,
      featuresJson: data.features ?? [],
    },
  });

  revalidatePath("/admin/boutique");
  revalidatePath("/dashboard/boutique");
  revalidatePath(`/dashboard/boutique/${slug}`);
  return { ok: true };
}

export async function deleteBoutiqueProduit(
  produitId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const id = bigOrNull(produitId);
  if (!id) return { ok: false, error: "Identifiant invalide" };

  // Vérifie qu'il n'y a pas d'items de commande liés (onDelete: Restrict en DB)
  const itemsCount = await prisma.boutiqueCommandeItem.count({
    where: { produitId: id },
  });
  if (itemsCount > 0) {
    return {
      ok: false,
      error: `Impossible de supprimer : ${itemsCount} ligne${itemsCount > 1 ? "s" : ""} de commande liée${itemsCount > 1 ? "s" : ""}. Archive le produit à la place.`,
    };
  }

  await prisma.boutiqueProduit.delete({ where: { id } });
  revalidatePath("/admin/boutique");
  revalidatePath("/dashboard/boutique");
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Commandes — gestion admin (changement de statut + notes admin)
// ----------------------------------------------------------------------------

const updateCommandeSchema = z.object({
  id: z.string(),
  statut: z.enum([
    "en_attente",
    "en_preparation",
    "expediee",
    "livree",
    "annulee",
  ]),
  notesAdmin: z.string().max(2000).optional().or(z.literal("")),
});

export async function updateBoutiqueCommande(
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateCommandeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const id = bigOrNull(parsed.data.id);
  if (!id) return { ok: false, error: "Identifiant invalide" };

  await prisma.boutiqueCommande.update({
    where: { id },
    data: {
      statut: parsed.data.statut,
      notesAdmin: parsed.data.notesAdmin || null,
    },
  });

  revalidatePath("/admin/boutique/commandes");
  revalidatePath("/dashboard/boutique/commandes");
  return { ok: true };
}
