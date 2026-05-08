import "server-only";
import { prisma } from "@/lib/db";

/**
 * Charge l'arbre menu complet d'un restaurant : catégories triées par position,
 * avec leurs produits et tags relationnels.
 */
export async function getMenuTree(restaurantId: bigint) {
  return prisma.categorie.findMany({
    where: { restaurantId, parentId: null },
    orderBy: { position: "asc" },
    include: {
      children: {
        orderBy: { position: "asc" },
        include: {
          produits: {
            orderBy: { position: "asc" },
            include: {
              vignettes: { include: { vignette: true } },
              allergenes: { include: { allergene: true } },
            },
          },
        },
      },
      produits: {
        orderBy: { position: "asc" },
        include: {
          vignettes: { include: { vignette: true } },
          allergenes: { include: { allergene: true } },
        },
      },
    },
  });
}

export async function getMenuRefData() {
  const [vignettes, allergenes] = await Promise.all([
    prisma.vignette.findMany({ orderBy: { code: "asc" } }),
    prisma.allergene.findMany({ orderBy: { code: "asc" } }),
  ]);
  return { vignettes, allergenes };
}

export type MenuTree = Awaited<ReturnType<typeof getMenuTree>>;
export type MenuRefData = Awaited<ReturnType<typeof getMenuRefData>>;
