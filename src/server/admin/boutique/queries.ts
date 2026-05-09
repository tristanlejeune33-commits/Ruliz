import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Liste tous les produits boutique pour l'admin (tous statuts confondus). */
export async function listBoutiqueProduitsAdmin() {
  return prisma.boutiqueProduit.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { commandeItems: true } },
    },
  });
}

/** Récupère un produit par ID (admin). null si inexistant. */
export async function getBoutiqueProduitById(id: bigint) {
  return prisma.boutiqueProduit.findUnique({ where: { id } });
}

interface ListCommandesFilters {
  statut?:
    | "en_attente"
    | "en_preparation"
    | "expediee"
    | "livree"
    | "annulee";
  /** Recherche fulltext sur user (email/prenom/nom). Insensible à la casse. */
  query?: string;
}

/** Liste les commandes pour l'admin avec filtres optionnels. */
export async function listBoutiqueCommandesAdmin(
  filters: ListCommandesFilters = {},
) {
  const where: Prisma.BoutiqueCommandeWhereInput = {};
  if (filters.statut) where.statut = filters.statut;
  if (filters.query?.trim()) {
    const q = filters.query.trim();
    where.user = {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { prenom: { contains: q, mode: "insensitive" } },
        { nom: { contains: q, mode: "insensitive" } },
      ],
    };
  }
  return prisma.boutiqueCommande.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          produit: { select: { id: true, nom: true, slug: true, imageUrl: true } },
        },
      },
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
  const [totalProduits, publies, totalCommandes, enAttente, revenueAgg] =
    await Promise.all([
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
