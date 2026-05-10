import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Calcule le stock utilisé pour une liste de produit IDs : somme des
 * quantites des items de commandes non annulées.
 *
 * Renvoie un Map<produitId, stockUtilise>. Les produits sans commande sont
 * absents du Map (interpréter comme 0).
 */
export async function getStockUsedByProduitIds(produitIds: bigint[]) {
  if (produitIds.length === 0) return new Map<string, number>();
  const groups = await prisma.boutiqueCommandeItem.groupBy({
    by: ["produitId"],
    where: {
      produitId: { in: produitIds },
      commande: { statut: { not: "annulee" } },
    },
    _sum: { quantite: true },
  });
  const map = new Map<string, number>();
  for (const g of groups) {
    map.set(g.produitId.toString(), g._sum.quantite ?? 0);
  }
  return map;
}

/**
 * Stock utilisé pour un seul produit (commandes non annulées).
 */
export async function getStockUsedForProduit(produitId: bigint): Promise<number> {
  const agg = await prisma.boutiqueCommandeItem.aggregate({
    where: {
      produitId,
      commande: { statut: { not: "annulee" } },
    },
    _sum: { quantite: true },
  });
  return agg._sum.quantite ?? 0;
}

/** Liste tous les produits boutique pour l'admin (tous statuts confondus). */
export async function listBoutiqueProduitsAdmin() {
  const produits = await prisma.boutiqueProduit.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { commandeItems: true } },
    },
  });
  // Enrichit chaque produit avec stockUtilise et stockRestant calculés
  const stockUsed = await getStockUsedByProduitIds(produits.map((p) => p.id));
  return produits.map((p) => {
    const used = stockUsed.get(p.id.toString()) ?? 0;
    const remaining = p.stockMax === null ? null : Math.max(0, p.stockMax - used);
    return { ...p, stockUtilise: used, stockRestant: remaining };
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
