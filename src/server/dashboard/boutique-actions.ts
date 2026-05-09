"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";
import { requireDashboard } from "@/lib/session";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

const createCommandeSchema = z.object({
  produitId: z.string(),
  quantite: z.number().int().positive().max(1000),
  restaurantId: z.string().optional().or(z.literal("")),
  livraisonNom: z.string().max(255),
  livraisonAdresse: z.string().min(1, "Adresse requise").max(500),
  livraisonCodePostal: z.string().max(10),
  livraisonVille: z.string().max(100),
  livraisonPays: z.string().max(100).default("France"),
  livraisonTelephone: z.string().max(20).optional().or(z.literal("")),
  notesClient: z.string().max(2000).optional().or(z.literal("")),
});

/**
 * Crée une commande boutique pour le user connecté (ou impersonné si admin SAV).
 *
 * Snapshot : on copie le prix unitaire au moment de la commande pour que le
 * total reste cohérent même si l'admin change le prix du produit plus tard.
 *
 * Pas de Stripe pour MVP — la commande est créée avec statut "en_attente",
 * l'admin la traite manuellement et change le statut depuis /admin/boutique/commandes.
 */
export async function createBoutiqueCommande(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireDashboard();
  const parsed = createCommandeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  // Récupère l'user agissant (impersonné si admin SAV, sinon le réel)
  const acting = await getActingUserId();
  if (!acting) return { ok: false, error: "Session invalide" };

  const produitId = bigOrNull(data.produitId);
  if (!produitId) return { ok: false, error: "Produit invalide" };

  // Vérifie que le produit existe ET est publié
  const produit = await prisma.boutiqueProduit.findUnique({
    where: { id: produitId },
  });
  if (!produit) return { ok: false, error: "Produit introuvable" };
  if (produit.statut !== "publie") {
    return { ok: false, error: "Ce produit n'est pas disponible à la commande" };
  }

  // Restaurant rattaché — si fourni, on vérifie que le user en est bien propriétaire
  let restaurantId: bigint | null = null;
  if (data.restaurantId) {
    const restoBig = bigOrNull(data.restaurantId);
    if (restoBig) {
      const owned = await prisma.restaurant.findFirst({
        where: { id: restoBig, userId: acting.actingUserId },
        select: { id: true },
      });
      if (owned) restaurantId = owned.id;
    }
  }

  const totalCentimes = produit.prixCentimes * data.quantite;

  const created = await prisma.boutiqueCommande.create({
    data: {
      produitId: produit.id,
      userId: acting.actingUserId,
      restaurantId,
      quantite: data.quantite,
      prixUnitaire: produit.prixCentimes,
      totalCentimes,
      devise: produit.devise,
      livraisonNom: data.livraisonNom || null,
      livraisonAdresse: data.livraisonAdresse,
      livraisonCodePostal: data.livraisonCodePostal || null,
      livraisonVille: data.livraisonVille || null,
      livraisonPays: data.livraisonPays || "France",
      livraisonTelephone: data.livraisonTelephone || null,
      notesClient: data.notesClient || null,
      statut: "en_attente",
    },
  });

  revalidatePath("/dashboard/boutique/commandes");
  revalidatePath("/admin/boutique/commandes");
  return { ok: true, data: { id: created.id.toString() } };
}
