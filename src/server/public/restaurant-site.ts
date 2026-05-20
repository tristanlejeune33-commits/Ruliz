import "server-only";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import {
  defaultSiteConfig,
  type RestaurantSiteBranding,
  type RestaurantSiteConfig,
} from "@/features/restaurant-site/types";

/**
 * Source de vérité pour la page publique `/site/[id]` et la preview iframe
 * dans le dashboard. Lit le branding via Prisma (typage natif) et le
 * site_config via raw SQL (la colonne JSONB n'est pas dans schema.prisma
 * pour éviter une régen client à chaque déploiement Railway).
 */

export interface PublicSitePayload {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
  /** False si le restaurateur n'a pas activé la feature → on retourne null. */
  enabled: boolean;
}

/**
 * Charge le payload public du site d'un resto.
 *
 *  - Si `site_enabled = false` → retourne `null` (la route doit 404).
 *  - Si `site_config = null` (jamais sauvé) → on génère un config par défaut
 *    depuis le nom/description du resto pour que la page rende quelque
 *    chose même avant la première édition (utile pour la preview).
 *
 * Cache : on s'appuie sur l'ISR de la page (`revalidate = 60`). Pas de
 * Redis pour l'instant — la page est moins critique que la carte.
 */
export async function getPublicSite(
  restaurantId: bigint,
): Promise<PublicSitePayload | null> {
  // S'assure que les colonnes site_* existent avant de les sélectionner.
  await ensureRuntimeSchema();

  type Row = {
    id: bigint;
    nom: string;
    description: string | null;
    logoUrl: string | null;
    banniereUrl: string | null;
    couleurPrimaire: string | null;
    couleurSecondaire: string | null;
    couleurFond: string | null;
    couleurTexteTitre: string | null;
    theme: string | null;
    fontStyle: string | null;
    ville: string | null;
    pays: string | null;
    adresse: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    siteWeb: string | null;
    googleReviewUrl: string | null;
    statut: string;
    site_enabled: boolean | null;
    site_config: unknown;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      id,
      nom,
      description,
      logo_url           AS "logoUrl",
      banniere_url       AS "banniereUrl",
      couleur_primaire   AS "couleurPrimaire",
      couleur_secondaire AS "couleurSecondaire",
      couleur_fond       AS "couleurFond",
      couleur_texte_titre AS "couleurTexteTitre",
      theme,
      font_style         AS "fontStyle",
      ville,
      pays,
      adresse,
      facebook_url       AS "facebookUrl",
      instagram_url      AS "instagramUrl",
      tiktok_url         AS "tiktokUrl",
      site_web           AS "siteWeb",
      google_review_url  AS "googleReviewUrl",
      statut,
      site_enabled,
      site_config
    FROM restaurants
    WHERE id = ${restaurantId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  // Resto suspendu → page indisponible
  if (row.statut === "suspendu") return null;

  const enabled = Boolean(row.site_enabled);

  const branding: RestaurantSiteBranding = {
    id: row.id.toString(),
    nom: row.nom,
    description: row.description,
    logoUrl: row.logoUrl,
    banniereUrl: row.banniereUrl,
    couleurPrimaire: row.couleurPrimaire,
    couleurSecondaire: row.couleurSecondaire,
    couleurFond: row.couleurFond,
    couleurTexteTitre: row.couleurTexteTitre,
    theme: (row.theme as "light" | "dark") ?? "light",
    fontStyle:
      (row.fontStyle as "modern" | "editorial" | "elegant") ?? "editorial",
    ville: row.ville,
    pays: row.pays,
    adresse: row.adresse,
    facebookUrl: row.facebookUrl,
    instagramUrl: row.instagramUrl,
    tiktokUrl: row.tiktokUrl,
    siteWeb: row.siteWeb,
    googleReviewUrl: row.googleReviewUrl,
  };

  const config = parseOrDefaultConfig(row.site_config, {
    nom: branding.nom,
    description: branding.description,
  });

  return { branding, config, enabled };
}

/**
 * Parse le JSON config en validant la structure minimale.
 * En cas d'erreur/null → on retombe sur le default.
 */
function parseOrDefaultConfig(
  raw: unknown,
  fallback: { nom: string; description: string | null },
): RestaurantSiteConfig {
  if (!raw || typeof raw !== "object") {
    return defaultSiteConfig(fallback);
  }
  const c = raw as Partial<RestaurantSiteConfig>;
  // Validation minimale + merge avec defaults pour les champs manquants
  const def = defaultSiteConfig(fallback);
  return {
    version: 1,
    sections: { ...def.sections, ...(c.sections ?? {}) },
    hero: { ...def.hero, ...(c.hero ?? {}) },
    about: c.about ?? def.about,
    menuTeaser: c.menuTeaser ?? def.menuTeaser,
    gallery: Array.isArray(c.gallery) ? c.gallery : def.gallery,
    testimonials: Array.isArray(c.testimonials) ? c.testimonials : def.testimonials,
    practical: c.practical ?? def.practical,
    reservation: c.reservation ?? def.reservation,
    seo: c.seo ?? def.seo,
    style: c.style ?? def.style,
  };
}
