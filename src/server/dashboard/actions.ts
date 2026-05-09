"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  assertRestaurantOwner,
  setActiveRestaurantCookie,
} from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { canCreateRestaurant } from "@/lib/restaurant-limits";
import { requireDashboard } from "@/lib/session";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------- Active restaurant ----------------

export async function setActiveRestaurant(id: string): Promise<ActionResult> {
  let bigId: bigint;
  try {
    bigId = BigInt(id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const restaurant = await assertRestaurantOwner(bigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  await setActiveRestaurantCookie(bigId);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------- Restaurant edit ----------------

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const optHex = z
  .string()
  .regex(HEX_COLOR, "Format hexa #RRGGBB")
  .optional()
  .or(z.literal(""));

const restaurantSchema = z.object({
  id: z.string(),
  nom: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100).optional().or(z.literal("")),
  deviseDefault: z.string().max(5).optional().or(z.literal("")),
  langueNative: z.enum(["fr", "en", "es", "de", "it", "pt", "zh"]).optional(),
  // Theme
  theme: z.enum(["light", "dark"]).optional(),
  fontStyle: z.enum(["modern", "editorial", "elegant"]).optional(),
  // Colors
  couleurPrimaire: optHex,
  couleurSecondaire: optHex,
  couleurFond: optHex,
  couleurTexteTitre: optHex,
  couleurCategorie: optHex,
  // Social
  facebookUrl: z.string().max(500).optional().or(z.literal("")),
  instagramUrl: z.string().max(500).optional().or(z.literal("")),
  tiktokUrl: z.string().max(500).optional().or(z.literal("")),
  siteWeb: z.string().max(500).optional().or(z.literal("")),
  googleReviewUrl: z.string().max(500).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  banniereUrl: z.string().max(500).optional().or(z.literal("")),
});

export async function updateRestaurant(input: unknown): Promise<ActionResult> {
  const parsed = restaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  let bigId: bigint;
  try {
    bigId = BigInt(data.id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  const empty = (v: string | undefined) => (v && v.trim().length > 0 ? v : null);

  await prisma.restaurant.update({
    where: { id: bigId },
    data: {
      nom: data.nom,
      description: empty(data.description),
      email: empty(data.email),
      telephone: empty(data.telephone),
      adresse: empty(data.adresse),
      codePostal: empty(data.codePostal),
      ville: empty(data.ville),
      pays: empty(data.pays),
      deviseDefault: empty(data.deviseDefault) ?? "€",
      langueNative: data.langueNative ?? "fr",
      theme: data.theme ?? "light",
      fontStyle: data.fontStyle ?? "editorial",
      couleurPrimaire: empty(data.couleurPrimaire),
      couleurSecondaire: empty(data.couleurSecondaire),
      couleurFond: empty(data.couleurFond),
      couleurTexteTitre: empty(data.couleurTexteTitre),
      couleurCategorie: empty(data.couleurCategorie),
      facebookUrl: empty(data.facebookUrl),
      instagramUrl: empty(data.instagramUrl),
      tiktokUrl: empty(data.tiktokUrl),
      siteWeb: empty(data.siteWeb),
      googleReviewUrl: empty(data.googleReviewUrl),
      logoUrl: empty(data.logoUrl),
      banniereUrl: empty(data.banniereUrl),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/restaurant");
  revalidatePath(`/carte/${bigId.toString()}`);
  return { ok: true };
}

// ---------------- Create first restaurant (onboarding) ----------------

const createRestaurantSchema = z.object({
  nom: z.string().min(1).max(255),
  ville: z.string().max(100).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  telephone: z.string().max(20).optional().or(z.literal("")),
});

export async function createFirstRestaurant(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable." };
  }

  const limit = await canCreateRestaurant(authUser.userId);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Ton plan ${limit.plan} est limité à ${limit.max} restaurant${limit.max && limit.max > 1 ? "s" : ""}. Passe Pro pour en ajouter d'autres.`,
    };
  }

  const empty = (v: string | undefined) => (v && v.trim().length > 0 ? v : null);

  const restaurant = await prisma.restaurant.create({
    data: {
      userId: authUser.userId,
      nom: parsed.data.nom,
      ville: empty(parsed.data.ville),
      email: empty(parsed.data.email),
      telephone: empty(parsed.data.telephone),
      pays: "France",
      plan: "freemium",
      statut: "actif",
    },
  });

  // Set as active restaurant cookie
  await setActiveRestaurantCookie(restaurant.id);

  revalidatePath("/dashboard");
  return { ok: true, data: { id: restaurant.id.toString() } };
}
