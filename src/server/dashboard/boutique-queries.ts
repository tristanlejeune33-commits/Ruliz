import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { CART_COOKIE, parseCart } from "@/lib/boutique-cart";
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

/** Commandes du user connecté (ou impersonné). Inclut les items. */
export async function listMyBoutiqueCommandes() {
  const acting = await getActingUserId();
  if (!acting) return [];
  return prisma.boutiqueCommande.findMany({
    where: { userId: acting.actingUserId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          produit: {
            select: { id: true, nom: true, slug: true, imageUrl: true },
          },
        },
      },
      restaurant: { select: { id: true, nom: true } },
    },
    take: 100,
  });
}

/**
 * Panier "hydraté" — pour chaque produitId du cookie, on jointure sur la DB
 * pour obtenir nom, prix, image actuels. Si un produit n'existe plus ou
 * n'est plus publié, il est filtré silencieusement.
 */
export async function getHydratedCart() {
  const cookieStore = await cookies();
  const items = parseCart(cookieStore.get(CART_COOKIE)?.value);
  if (items.length === 0) return [];

  const produitIds = items
    .map((i) => {
      try {
        return BigInt(i.produitId);
      } catch {
        return null;
      }
    })
    .filter((x): x is bigint => x !== null);

  const produits = await prisma.boutiqueProduit.findMany({
    where: { id: { in: produitIds }, statut: "publie" },
  });

  return items
    .map((i) => {
      const produit = produits.find((p) => p.id.toString() === i.produitId);
      if (!produit) return null;
      return {
        produitId: i.produitId,
        quantite: i.quantite,
        produit,
        totalCentimes: produit.prixCentimes * i.quantite,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
