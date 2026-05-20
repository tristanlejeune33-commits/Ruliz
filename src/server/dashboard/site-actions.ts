"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { invalidateSiteCache } from "@/server/public/restaurant-site";
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slugify";
import type {
  RestaurantSiteConfig,
  SiteTemplate,
} from "@/features/restaurant-site/types";
import { SITE_TEMPLATES } from "@/features/restaurant-site/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

/**
 * Schémas Zod stricts — la validation serveur fait foi. Si le client envoie
 * un payload corrompu (devtools, mauvais code, attaque) on rejette.
 */

const heroSchema = z.object({
  variant: z.enum(["split", "banner", "centered", "video"]),
  title: z.string().max(255).optional(),
  subtitle: z.string().max(1000).optional(),
  imageUrl: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional(),
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
  team: z.boolean(),
  faq: z.boolean(),
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

const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  imageUrl: z.string().max(500).optional(),
});

const faqItemSchema = z.object({
  question: z.string().min(1).max(255),
  answer: z.string().min(1).max(2000),
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
  team: z.array(teamMemberSchema).max(12).optional(),
  faq: z.array(faqItemSchema).max(20).optional(),
  practical: practicalSchema.optional(),
  reservation: reservationSchema.optional(),
  seo: seoSchema.optional(),
  style: styleSchema.optional(),
  slug: z.string().max(64).optional(),
});

type SaveResult =
  | { ok: true; slug?: string | null }
  | { ok: false; error: string };

/**
 * Rate limit en mémoire — max 20 saves / minute / restaurant.
 * Protège contre les boucles de save involontaires et les attaques.
 * En cluster (multi-process), un user pourrait dépasser légèrement, mais
 * c'est OK pour une feature non-critique.
 */
const saveAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = saveAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    saveAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/**
 * Garde plan — restriction Pro/Premium pour activer ou éditer le site.
 * Le freemium voit la page éditeur mais reçoit une erreur sur save.
 */
function isPlanAllowed(plan: string): boolean {
  return plan === "pro" || plan === "premium";
}

/**
 * Sauvegarde la config du mini-site pour le resto courant.
 */
export async function saveSiteConfig(
  payload: RestaurantSiteConfig,
): Promise<SaveResult> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  // Gate plan
  if (!isPlanAllowed(restaurant.plan)) {
    return {
      ok: false,
      error: "Le site vitrine nécessite un plan Pro ou Premium.",
    };
  }

  // Rate limit
  if (!checkRateLimit(`save-site:${restaurantId.toString()}`)) {
    return {
      ok: false,
      error: "Trop de sauvegardes en une minute. Attends quelques secondes.",
    };
  }

  const parsed = configSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Validation: ${first?.path.join(".") ?? "?"} → ${first?.message ?? "invalide"}`,
    };
  }

  await ensureRuntimeSchema();

  // Slug validation : si fourni → check format + non réservé + unicité
  let finalSlug: string | null = null;
  if (parsed.data.slug !== undefined) {
    const requested = parsed.data.slug.trim();
    if (requested.length === 0) {
      finalSlug = null; // user veut retirer le slug
    } else {
      if (!isValidSlug(requested)) {
        return {
          ok: false,
          error:
            "Slug invalide. Utilise des minuscules, chiffres et tirets uniquement (2-64 caractères).",
        };
      }
      if (isReservedSlug(requested)) {
        return {
          ok: false,
          error: `Slug réservé. Choisis-en un autre.`,
        };
      }
      // Vérifie unicité — sauf si déjà le sien
      const existing = await prisma.$queryRaw<Array<{ id: bigint }>>`
        SELECT id FROM restaurants
        WHERE site_slug = ${requested} AND id != ${restaurantId}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return {
          ok: false,
          error: "Ce slug est déjà utilisé par un autre restaurant.",
        };
      }
      finalSlug = requested;
    }
  }

  // Strip le slug du JSON (il vit dans sa colonne dédiée)
  const cleanConfig = { ...parsed.data };
  delete (cleanConfig as { slug?: string }).slug;

  try {
    if (finalSlug !== null || parsed.data.slug !== undefined) {
      await prisma.$executeRaw`
        UPDATE restaurants
        SET site_config = ${JSON.stringify(cleanConfig)}::jsonb,
            site_slug = ${finalSlug},
            site_updated_at = NOW()
        WHERE id = ${restaurantId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE restaurants
        SET site_config = ${JSON.stringify(cleanConfig)}::jsonb,
            site_updated_at = NOW()
        WHERE id = ${restaurantId}
      `;
    }
  } catch (err) {
    console.error("[saveSiteConfig] update failed:", err);
    return { ok: false, error: "Erreur DB lors de la sauvegarde" };
  }

  // Invalide tous les caches
  await invalidateSiteCache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  if (finalSlug) revalidatePath(`/site/${finalSlug}`);
  revalidatePath("/dashboard/site");
  revalidatePath("/sitemap.xml");

  return { ok: true, slug: finalSlug };
}

/**
 * Toggle on/off — active ou désactive le mini-site sans toucher au config.
 * Auto-génère un slug si activation et slug pas encore défini.
 */
export async function toggleSiteEnabled(
  enabled: boolean,
): Promise<SaveResult> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  if (!isPlanAllowed(restaurant.plan)) {
    return {
      ok: false,
      error: "Le site vitrine nécessite un plan Pro ou Premium.",
    };
  }

  await ensureRuntimeSchema();

  try {
    if (enabled) {
      // Si activation : auto-gen slug à partir du nom si pas déjà défini
      const rows = await prisma.$queryRaw<Array<{ siteSlug: string | null }>>`
        SELECT site_slug AS "siteSlug" FROM restaurants WHERE id = ${restaurantId} LIMIT 1
      `;
      const current = rows[0]?.siteSlug;
      if (!current) {
        // Génère un slug unique en ajoutant un suffixe -2, -3 si conflit
        const base = slugify(restaurant.nom) || `resto-${restaurantId.toString()}`;
        let candidate = base;
        let attempt = 1;
        while (attempt < 50) {
          const collision = await prisma.$queryRaw<Array<{ id: bigint }>>`
            SELECT id FROM restaurants WHERE site_slug = ${candidate} LIMIT 1
          `;
          if (collision.length === 0) break;
          attempt += 1;
          candidate = `${base}-${attempt}`;
        }
        await prisma.$executeRaw`
          UPDATE restaurants
          SET site_enabled = true,
              site_slug = ${candidate}
          WHERE id = ${restaurantId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE restaurants
          SET site_enabled = true
          WHERE id = ${restaurantId}
        `;
      }
    } else {
      await prisma.$executeRaw`
        UPDATE restaurants
        SET site_enabled = false
        WHERE id = ${restaurantId}
      `;
    }
  } catch (err) {
    console.error("[toggleSiteEnabled] update failed:", err);
    return { ok: false, error: "Erreur DB" };
  }

  await invalidateSiteCache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

/**
 * Génère un QR code dataURL PNG pointant vers le site vitrine du resto.
 * Différent du QR de la carte — celui-ci envoie sur /site/[slug] pour les
 * cartes de visite, sets de table, vitrine, flyers.
 */
export async function getSiteQrDataUrl(): Promise<
  { ok: true; dataUrl: string; url: string } | { ok: false; error: string }
> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  await ensureRuntimeSchema();
  const rows = await prisma.$queryRaw<
    Array<{ siteSlug: string | null; siteEnabled: boolean }>
  >`
    SELECT site_slug AS "siteSlug", site_enabled AS "siteEnabled"
    FROM restaurants WHERE id = ${restaurantId} LIMIT 1
  `;
  const slug = rows[0]?.siteSlug;
  const enabled = rows[0]?.siteEnabled;
  if (!enabled) {
    return { ok: false, error: "Active d'abord ton site pour générer son QR." };
  }
  const url = `${APP_URL}/site/${slug ?? restaurantId.toString()}`;
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 2,
      width: 800,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return { ok: true, dataUrl, url };
  } catch (e) {
    console.error("[getSiteQrDataUrl] generation failed:", e);
    return { ok: false, error: "Erreur de génération du QR" };
  }
}

/**
 * Applique un template pré-fait au site. Écrase la config courante.
 * Le user peut ensuite modifier librement.
 */
export async function applySiteTemplate(
  templateId: SiteTemplate["id"],
): Promise<SaveResult> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  if (!isPlanAllowed(restaurant.plan)) {
    return {
      ok: false,
      error: "Le site vitrine nécessite un plan Pro ou Premium.",
    };
  }

  const template = SITE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return { ok: false, error: "Template inconnu." };
  }

  const config = template.apply({
    nom: restaurant.nom,
    description: restaurant.description,
  });

  await ensureRuntimeSchema();
  try {
    await prisma.$executeRaw`
      UPDATE restaurants
      SET site_config = ${JSON.stringify(config)}::jsonb,
          site_updated_at = NOW()
      WHERE id = ${restaurantId}
    `;
  } catch (err) {
    console.error("[applySiteTemplate] update failed:", err);
    return { ok: false, error: "Erreur DB" };
  }

  await invalidateSiteCache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");
  return { ok: true };
}
