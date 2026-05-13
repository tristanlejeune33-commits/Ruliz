/**
 * Panier boutique · stocké côté client dans un cookie JSON, lu côté serveur
 * pour valider la commande au moment du checkout.
 *
 * Format : `[{ produitId: "123", quantite: 2 }, ...]`
 *
 * Pourquoi cookie et pas localStorage ? Parce qu'on doit pouvoir lire le
 * panier côté serveur (page panier RSC, action createBoutiqueCommande)
 * sans appel client supplémentaire.
 *
 * Pourquoi pas une table DB `boutique_cart` ? KISS · la persistance entre
 * sessions n'est pas critique (panier expire après 7j de toute façon), pas
 * de jointure à faire, l'écriture client est triviale via document.cookie.
 */

import { z } from "zod";

export const CART_COOKIE = "ruliz_boutique_cart";
export const CART_TTL_DAYS = 7;
export const CART_MAX_ITEMS = 20;

const cartItemSchema = z.object({
  produitId: z.string(),
  quantite: z.number().int().positive().max(1000),
});

const cartSchema = z.array(cartItemSchema).max(CART_MAX_ITEMS);

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = CartItem[];

/** Parse un cookie panier brut. Retourne array vide si invalide. */
export function parseCart(raw: string | undefined): Cart {
  if (!raw) return [];
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    const result = cartSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** Sérialise un panier en string pour le cookie. */
export function serializeCart(cart: Cart): string {
  return encodeURIComponent(JSON.stringify(cart));
}

/** Ajoute un produit au panier (incrémente la quantité s'il y est déjà). */
export function addToCart(cart: Cart, produitId: string, quantite: number = 1): Cart {
  const existing = cart.find((i) => i.produitId === produitId);
  if (existing) {
    return cart.map((i) =>
      i.produitId === produitId
        ? { ...i, quantite: Math.min(1000, i.quantite + quantite) }
        : i,
    );
  }
  if (cart.length >= CART_MAX_ITEMS) return cart;
  return [...cart, { produitId, quantite }];
}

/** Met à jour la quantité d'un item. Retire si quantité ≤ 0. */
export function setQuantity(cart: Cart, produitId: string, quantite: number): Cart {
  if (quantite <= 0) return cart.filter((i) => i.produitId !== produitId);
  return cart.map((i) =>
    i.produitId === produitId ? { ...i, quantite: Math.min(1000, quantite) } : i,
  );
}

/** Retire un item du panier. */
export function removeFromCart(cart: Cart, produitId: string): Cart {
  return cart.filter((i) => i.produitId !== produitId);
}

/** Total d'items (somme des quantités). */
export function cartCount(cart: Cart): number {
  return cart.reduce((s, i) => s + i.quantite, 0);
}
