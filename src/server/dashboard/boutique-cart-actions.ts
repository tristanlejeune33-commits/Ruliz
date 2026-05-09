"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  CART_COOKIE,
  CART_TTL_DAYS,
  addToCart,
  parseCart,
  removeFromCart,
  serializeCart,
  setQuantity,
  type Cart,
} from "@/lib/boutique-cart";

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

export async function addToCartAction(
  produitId: string,
  quantite: number = 1,
) {
  const cart = await readCart();
  const next = addToCart(cart, produitId, quantite);
  await writeCart(next);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true as const };
}

export async function setCartQuantityAction(
  produitId: string,
  quantite: number,
) {
  const cart = await readCart();
  const next = setQuantity(cart, produitId, quantite);
  await writeCart(next);
  revalidatePath("/dashboard/boutique", "layout");
  return { ok: true as const };
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
