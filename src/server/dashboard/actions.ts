"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  assertRestaurantOwner,
  setActiveRestaurantCookie,
} from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";

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

const restaurantSchema = z.object({
  id: z.string(),
  nom: z.string().min(1, "Requis").max(255),
  email: z.string().max(255).optional().or(z.literal("")),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100).optional().or(z.literal("")),
  couleurPrimaire: z
    .string()
    .regex(HEX_COLOR, "Format hexa #RRGGBB")
    .optional()
    .or(z.literal("")),
  couleurSecondaire: z
    .string()
    .regex(HEX_COLOR, "Format hexa #RRGGBB")
    .optional()
    .or(z.literal("")),
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
      email: empty(data.email),
      telephone: empty(data.telephone),
      adresse: empty(data.adresse),
      codePostal: empty(data.codePostal),
      ville: empty(data.ville),
      pays: empty(data.pays),
      couleurPrimaire: empty(data.couleurPrimaire),
      couleurSecondaire: empty(data.couleurSecondaire),
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
