"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { invalidateSiteV2Cache } from "@/server/public/restaurant-site-v2-loader";
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slugify";

/**
 * Server actions du nouveau template site v2.
 *
 * Distinct des anciennes site-actions.ts (v1, supprimées) :
 *   - Schema Zod aligné sur RestaurantConfig v2
 *   - Stocke un blob JSONB `site_config` avec `version: 2`
 *   - Pas de templates pré-faits (un seul design)
 *   - Pas d'auto-translate (le brief v2 ne le demande pas)
 *   - Plan gate Pro/Premium maintenu
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

// === Schémas Zod ===

const aboutSchema = z.object({
  title: z.string().max(255).optional(),
  body: z.array(z.string().max(2000)).max(6).optional(),
  image: z.string().max(500).optional(),
  signature: z.string().max(120).optional(),
});

const testimonialSchema = z.object({
  rating: z.number().min(0).max(5),
  text: z.string().min(1).max(2000),
  author: z.string().min(1).max(120),
});

const hoursRowSchema = z.object({
  day: z.enum(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]),
  hours: z.string().max(120).nullable(),
});

const optionsSchema = z.object({
  showGallery: z.boolean(),
  showTestimonials: z.boolean(),
  showReservation: z.boolean(),
  /** Toggle Maps embed dans la section Pratique. */
  showMap: z.boolean(),
  theme: z.enum(["light", "dark"]),
  aboutImageLeft: z.boolean(),
  heroLayout: z.enum(["banner", "split"]),
});

const v2ConfigSchema = z.object({
  version: z.literal(2),
  tagline: z.string().max(255).optional(),
  established: z.number().int().min(1800).max(2100).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$|^oklch\(.+\)$/i, "Format hex ou oklch")
    .optional(),
  typographyPreset: z.enum(["editorial", "modern", "classic"]).optional(),
  about: aboutSchema.optional(),
  menuTeaser: z
    .object({
      title: z.string().max(255).optional(),
      /**
       * IDs des produits en vitrine choisis manuellement (max 4).
       * String car les BigInt côté Prisma sont sérialisés en string
       * sur le wire. Order = order d'affichage sur la grille 4-col.
       * Si vide → fallback auto top-4 côté loader.
       */
      productIds: z.array(z.string().regex(/^\d+$/)).max(4).optional(),
    })
    .optional(),
  gallery: z.array(z.string().min(1).max(500)).max(12).optional(),
  testimonials: z.array(testimonialSchema).max(12).optional(),
  reservationUrl: z.string().max(500).optional().or(z.literal("")),
  hoursOverride: z.array(hoursRowSchema).length(7).optional(),
  options: optionsSchema.partial().optional(),
  slug: z.string().max(64).optional(),
});

export type SiteV2ConfigInput = z.infer<typeof v2ConfigSchema>;

type SaveResult =
  | { ok: true; slug?: string | null }
  | { ok: false; error: string };

// === Rate limit + plan gate ===

const lastSave = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = lastSave.get(key);
  if (!entry || entry.resetAt < now) {
    lastSave.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function isPlanAllowed(plan: string): boolean {
  return plan === "pro" || plan === "premium";
}

// === saveSiteV2Config ===

export async function saveSiteV2Config(
  payload: SiteV2ConfigInput,
): Promise<SaveResult> {
  const { restaurant } = await getCurrentRestaurant();
  const restaurantId = restaurant.id;

  if (!isPlanAllowed(restaurant.plan)) {
    return {
      ok: false,
      error: "Le site vitrine nécessite un plan Pro ou Premium.",
    };
  }

  if (!checkRateLimit(`save-site-v2:${restaurantId.toString()}`)) {
    return {
      ok: false,
      error: "Trop de sauvegardes en une minute. Attends quelques secondes.",
    };
  }

  const parsed = v2ConfigSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Validation: ${first?.path.join(".") ?? "?"} → ${first?.message ?? "invalide"}`,
    };
  }

  await ensureRuntimeSchema();

  // Slug validation — même logique que v1
  let finalSlug: string | null = null;
  if (parsed.data.slug !== undefined) {
    const requested = parsed.data.slug.trim();
    if (requested.length === 0) {
      finalSlug = null;
    } else {
      if (!isValidSlug(requested)) {
        return {
          ok: false,
          error:
            "Slug invalide. Minuscules, chiffres et tirets uniquement (2-64 caractères).",
        };
      }
      if (isReservedSlug(requested)) {
        return {
          ok: false,
          error: "Slug réservé. Choisis-en un autre.",
        };
      }
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

  // Strip slug du blob (vit dans sa colonne dédiée)
  const cleanConfig = { ...parsed.data };
  delete (cleanConfig as { slug?: string }).slug;
  // Normalise reservationUrl: "" → undefined
  if (cleanConfig.reservationUrl === "") {
    cleanConfig.reservationUrl = undefined;
  }

  try {
    if (parsed.data.slug !== undefined) {
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
    console.error("[saveSiteV2Config] update failed:", err);
    return { ok: false, error: "Erreur DB lors de la sauvegarde" };
  }

  await invalidateSiteV2Cache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  if (finalSlug) revalidatePath(`/site/${finalSlug}`);
  revalidatePath("/dashboard/site");
  revalidatePath("/sitemap.xml");

  return { ok: true, slug: finalSlug };
}

// === toggleSiteV2Enabled ===

export async function toggleSiteV2Enabled(
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
      // Auto-gen slug si activation et slug absent
      const rows = await prisma.$queryRaw<Array<{ siteSlug: string | null }>>`
        SELECT site_slug AS "siteSlug" FROM restaurants WHERE id = ${restaurantId} LIMIT 1
      `;
      const current = rows[0]?.siteSlug;
      if (!current) {
        const base =
          slugify(restaurant.nom) || `resto-${restaurantId.toString()}`;
        const cityPart = restaurant.ville ? slugify(restaurant.ville) : "";
        let candidate = base;
        let attempt = 1;
        // Try variations : base → base-city → base-2 → base-3 ...
        const variations = [base, ...(cityPart ? [`${base}-${cityPart}`] : [])];
        let found = false;
        for (const v of variations) {
          const collision = await prisma.$queryRaw<Array<{ id: bigint }>>`
            SELECT id FROM restaurants WHERE site_slug = ${v} LIMIT 1
          `;
          if (collision.length === 0) {
            candidate = v;
            found = true;
            break;
          }
        }
        while (!found && attempt < 50) {
          attempt += 1;
          candidate = `${base}-${attempt}`;
          const collision = await prisma.$queryRaw<Array<{ id: bigint }>>`
            SELECT id FROM restaurants WHERE site_slug = ${candidate} LIMIT 1
          `;
          if (collision.length === 0) {
            found = true;
            break;
          }
        }
        await prisma.$executeRaw`
          UPDATE restaurants
          SET site_enabled = true,
              site_slug = ${candidate}
          WHERE id = ${restaurantId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE restaurants SET site_enabled = true WHERE id = ${restaurantId}
        `;
      }
    } else {
      await prisma.$executeRaw`
        UPDATE restaurants SET site_enabled = false WHERE id = ${restaurantId}
      `;
    }
  } catch (err) {
    console.error("[toggleSiteV2Enabled] update failed:", err);
    return { ok: false, error: "Erreur DB" };
  }

  await invalidateSiteV2Cache(restaurantId);
  revalidatePath(`/site/${restaurantId.toString()}`);
  revalidatePath("/dashboard/site");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

// === QR Code site ===

export async function getSiteV2QrDataUrl(): Promise<
  | { ok: true; dataUrl: string; url: string }
  | { ok: false; error: string }
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
    console.error("[getSiteV2QrDataUrl] failed:", e);
    return { ok: false, error: "Erreur de génération du QR" };
  }
}
