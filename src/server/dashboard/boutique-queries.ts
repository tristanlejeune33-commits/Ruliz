import "server-only";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";

/**
 * Catalogue côté client : uniquement les produits publiés, triés par position
 * puis par date de création.
 */
export async function listBoutiqueProduitsPublic() {
  return prisma.boutiqueProduit.findMany({
    where: { statut: "publie" },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
}

/** Détail d'un produit publié par slug. null si introuvable ou non-publié. */
export async function getBoutiqueProduitBySlug(slug: string) {
  return prisma.boutiqueProduit.findFirst({
    where: { slug, statut: "publie" },
  });
}

/**
 * Commandes du user connecté (ou impersonné). Retourne array vide si pas de
 * session.
 */
export async function listMyBoutiqueCommandes() {
  const acting = await getActingUserId();
  if (!acting) return [];
  return prisma.boutiqueCommande.findMany({
    where: { userId: acting.actingUserId },
    orderBy: { createdAt: "desc" },
    include: {
      produit: { select: { id: true, nom: true, slug: true, imageUrl: true } },
      restaurant: { select: { id: true, nom: true } },
    },
    take: 100,
  });
}
