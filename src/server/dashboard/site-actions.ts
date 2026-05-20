"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import type { RestaurantSiteConfig } from "@/features/restaurant-site/types";

/**
 * Schémas Zod stricts pour valider le payload côté serveur (le client peut
 * envoyer n'importe quoi). Si validation fail → on retourne une erreur user-
 * friendly et on ne touche pas à la DB.
 */

const heroSchema = z.object({
  variant: z.enum(["split", "banner"]),
  title: z.string().max(255).optional(),
  subtitle: z.string().max(1000).optional(),
  imageUrl: z.string().max(500).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl: z.string().max(500).optional(),
  eyebrow: z.string().max(120).optional(),
});

const sectionsSchema = z.object({
  about: z.boolean(),
  menuTeaser: z.boolean(),
  gallery: z.boolean(),
  testimonials: z.boolean(),
  practical: z.boolean(),
  reservation: z.boolean(),
});

const aboutSchema = z.object({
  title: z.string().max(255).optional(),
  text: z.string().max(5000).optional(),
  imageUrl: z.string().max(500).optional(),
});

const menuTeaserSchema = z.object({
  title: z.string().max(255).optional(),
  subtitle: z.string().max(500).optional(),
  ctaLabel: z.string().max(100).optional(),
});

const galleryItemSchema = z.object({
  url: z.string().min(1).max(500),
  caption: z.string().max(255).optional(),
  alt: z.string().max(255).optional(),
});

const testimonialSchema = z.object({
  name: z.string().min(1).max(100),
  text: z.string().min(1).max(2000),
  rating: z.number().min(0).max(5).optional(),
  source: z.string().max(50).optional(),
  date: z.string().max(50).optional(),
});

const practicalSchema = z.object({
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  schedule: z.string().max(1000).optional(),
  mapsUrl: z.string().max(500).optional(),
});

const reservationSchema = z.object({
  url: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  label: z.string().max(100).optional(),
});

const seoSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(500).optional(),
});

const styleSchema = z.object({
  fontHeading: z.enum(["serif", "sans", "display"]).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Format #RRGGBB requis")
    .optional(),
});

const configSchema = z.object({
  version: z.literal(1),
  sections: sectionsSchema,
  hero: heroSchema,
  about: aboutSchema.optional(),
  menuTeaser: menuTeaserSchema.optional(),
  gallery: z.array(galleryItemSchema).max(30).optional(),
  testimonials: z.array(testimonialSchema).max(20).optional(),
  practical: practicalSchema.optional(),
  reservation: reservationSchema.optional(),
  seo: seoSchema.optional(),
  style: styleSchema.optional(),
});

type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Sauvegarde la config du mini-site pour le resto courant.
 * Auth-guard via `getCurrentRestaurant` qui vérifie l'ownership.
 */
export async function saveSiteConfig(
  payload: RestaurantSiteConfig,
): Promise<SaveResult> {
  // getCurrentRestaurant redirige automatiquement si pas auth/pas resto —
  // donc si on continue ici on a forcément un resto owned par le user.
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  const parsed = configSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Validation: ${first?.path.join(".") ?? "?"} → ${first?.message ?? "invalide"}`,
    };
  }

  await ensureRuntimeSchema();

  try {
    // Update via raw SQL : la colonne site_config est JSONB, on serialise.
    // Notez les params positionnels et le cast ::jsonb pour Postgres.
    await prisma.$executeRaw`
      UPDATE restaurants
      SET site_config = ${JSON.stringify(parsed.data)}::jsonb,
          site_updated_at = NOW()
      WHERE id = ${restaurantId}
    `;
  } catch (err) {
    console.error("[saveSiteConfig] update failed:", err);
    return { ok: false, error: "Erreur DB lors de la sauvegarde" };
  }

  // Invalide les caches : la page publique + la preview du dashboard
  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");

  return { ok: true };
}

/**
 * Toggle on/off — active ou désactive le mini-site sans toucher au config.
 * Si le restaurateur désactive, la route `/site/[id]` retourne 404.
 */
export async function toggleSiteEnabled(
  enabled: boolean,
): Promise<SaveResult> {
  // getCurrentRestaurant redirige automatiquement si pas auth/pas resto —
  // donc si on continue ici on a forcément un resto owned par le user.
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  await ensureRuntimeSchema();

  try {
    await prisma.$executeRaw`
      UPDATE restaurants
      SET site_enabled = ${enabled}
      WHERE id = ${restaurantId}
    `;
  } catch (err) {
    console.error("[toggleSiteEnabled] update failed:", err);
    return { ok: false, error: "Erreur DB" };
  }

  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");
  return { ok: true };
}
