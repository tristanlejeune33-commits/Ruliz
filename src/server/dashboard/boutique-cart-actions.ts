"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  CART_COOKIE,
  CART_TTL_DAYS,
  addToCart,
  cartCount,
  parseCart,
  removeFromCart,
  serializeCart,
  setQuantity,
  type Cart,
} from "@/lib/boutique-cart";
import { prisma } from "@/lib/db";
import { getStockUsedForProduit } from "@/server/admin/boutique/queries";

async function readCart(): Promise<Cart> {
  const cookieStore = await cookies();
  return parseCart(cookieStore.get(CART_COOKIE)?.value);
}

async function writeCart(cart: Cart) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, serializeCart(cart), {
    httpOnly: false, // accessible aussi côté client si besoin
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * CART_TTL_DAYS,
    path: "/",
  });
}

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Vérifie que la quantité totale demandée (panier + ajout) ne dépasse pas
 * le stock restant du produit. Retourne null si OK, sinon un message d'erreur.
 *
 * Le stock restant = stockMax - somme(items.quantite des commandes non
 * annulées). Les items du panier en cours ne sont pas décomptés (ils ne sont
 * pas encore "commandés" — on les ajoute virtuellement à la quantité demandée
 * pour éviter qu'un user dépasse le stock à la création de la commande).
 */
async function checkStock(
  produitId: string,
  quantiteTotaleVoulue: number,
): Promise<string | null> {
  let bigId: bigint;
  try {
    bigId = BigInt(produitId);
  } catch {
    return "Produit invalide";
  }
  const produit = await prisma.boutiqueProduit.findUnique({
    where: { id: bigId },
    select: { stockMax: true, nom: true, statut: true },
  });
  if (!produit) return "Produit introuvable";
  if (produit.statut !== "publie") {
    return "Ce produit n'est plus disponible";
  }
  if (produit.stockMax === null) return null; // illimité

  const used = await getStockUsedForProduit(bigId);
  const remaining = Math.max(0, produit.stockMax - used);
  if (quantiteTotaleVoulue > remaining) {
    return remaining === 0
      ? `« ${produit.nom} » est en rupture de stock`
      : `Stock insuffisant pour « ${produit.nom} » : ${remaining} unité${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`;
  }
  return null;
}

export async function addToCartAction(
  produitId: string,
  quantite: number = 1,
): Promise<ActionResult> {
  const cart = await readCart();
  // Quantité totale après ajout = ce qu'il y a déjà dans le panier + ajout
  const existing = cart.find((c) => c.produitId === produitId)?.quantite ?? 0;
  const totalVoulu = existing + quantite;
  const error = await checkStock(produitId, totalVoulu);
  if (error) return { ok: false, error };

  const next = addToCart(cart, produitId, quantite);
  await writeCart(next);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true };
}

export async function setCartQuantityAction(
  produitId: string,
  quantite: number,
): Promise<ActionResult> {
  if (quantite > 0) {
    const error = await checkStock(produitId, quantite);
    if (error) return { ok: false, error };
  }
  const cart = await readCart();
  const next = setQuantity(cart, produitId, quantite);
  await writeCart(next);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true };
}

export async function removeFromCartAction(produitId: string) {
  const cart = await readCart();
  const next = removeFromCart(cart, produitId);
  await writeCart(next);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true as const };
}

export async function clearCartAction() {
  await writeCart([]);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true as const };
}

/**
 * Retourne le nombre total d'articles dans le panier (somme des quantités).
 * Utilisé par le bouton panier de la topbar (CartIconButton).
 * 0 si panier vide ou cookie inexistant.
 */
export async function getCartCount(): Promise<number> {
  try {
    const cart = await readCart();
    return cartCount(cart);
  } catch {
    return 0;
  }
}
