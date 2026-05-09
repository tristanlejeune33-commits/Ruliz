import "server-only";
import { prisma } from "@/lib/db";

/** Liste tous les produits boutique pour l'admin (tous statuts confondus). */
export async function listBoutiqueProduitsAdmin() {
  return prisma.boutiqueProduit.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { commandes: true } },
    },
  });
}

/** Récupère un produit par ID (admin). null si inexistant. */
export async function getBoutiqueProduitById(id: bigint) {
  return prisma.boutiqueProduit.findUnique({ where: { id } });
}

/** Liste toutes les commandes pour l'admin avec produit + user. */
export async function listBoutiqueCommandesAdmin() {
  return prisma.boutiqueCommande.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      produit: { select: { id: true, nom: true, slug: true, imageUrl: true } },
      user: {
        select: {
          id: true,
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
        },
      },
      restaurant: { select: { id: true, nom: true } },
    },
    take: 200,
  });
}

/** KPI globaux pour le dashboard admin de la boutique. */
export async function getBoutiqueAdminStats() {
  const [
    totalProduits,
    publies,
    totalCommandes,
    enAttente,
    revenueAgg,
  ] = await Promise.all([
    prisma.boutiqueProduit.count(),
    prisma.boutiqueProduit.count({ where: { statut: "publie" } }),
    prisma.boutiqueCommande.count(),
    prisma.boutiqueCommande.count({ where: { statut: "en_attente" } }),
    prisma.boutiqueCommande.aggregate({
      _sum: { totalCentimes: true },
      where: { statut: { in: ["livree", "expediee"] } },
    }),
  ]);

  return {
    totalProduits,
    publies,
    totalCommandes,
    enAttente,
    revenueCentimes: revenueAgg._sum.totalCentimes ?? 0,
  };
}
