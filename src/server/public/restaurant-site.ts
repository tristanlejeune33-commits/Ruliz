import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import {
  defaultSiteConfig,
  type RestaurantSiteBranding,
  type RestaurantSiteConfig,
} from "@/features/restaurant-site/types";

/**
 * Source de vérité pour la page publique `/site/[idOrSlug]` et la preview
 * iframe dans le dashboard.
 *
 * Stratégie de cache :
 *   L1 Cloudflare (HTTP edge)    — handled in route headers / Next ISR
 *   L2 Next ISR (revalidate 60s) — handled in app/site/[id]/page.tsx
 *   L3 Redis ("site:{id}")       — handled here
 *   L4 DB raw query              — handled here
 *
 * Le payload est entièrement self-contained (branding + config + slug) →
 * un seul fetch suffit pour render la page complète.
 */

const REDIS_TTL_SECONDS = 60 * 30; // 30 min — invalidé manuellement à chaque save

function cacheKey(restaurantId: bigint | string): string {
  return `site:${restaurantId.toString()}`;
}

export interface PublicSitePayload {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
  /** Slug actuel — utile pour les redirections /site/[id] → /site/[slug]. */
  slug: string | null;
  /** False si le restaurateur n'a pas activé la feature → on retourne 404. */
  enabled: boolean;
  /** Plan resto — pour bloquer freemium (côté caller). */
  plan: "freemium" | "pro" | "premium";
}

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
  plan: string;
  site_enabled: boolean | null;
  site_config: unknown;
  site_slug: string | null;
};

function rowToPayload(row: Row): PublicSitePayload {
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
  return {
    branding,
    config,
    slug: row.site_slug,
    enabled: Boolean(row.site_enabled),
    plan: (row.plan as "freemium" | "pro" | "premium") ?? "freemium",
  };
}

const SELECT_COLUMNS = `
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
  plan,
  site_enabled,
  site_config,
  site_slug
`;

/**
 * Charge le payload public d'un resto par ID numérique.
 *
 * @param skipRedis Bypass L3 cache (utile dans la preview dashboard pour
 *                  voir tout de suite la dernière sauvegarde sans attendre
 *                  l'expiration TTL).
 */
export async function getPublicSite(
  restaurantId: bigint,
  options: { skipRedis?: boolean } = {},
): Promise<PublicSitePayload | null> {
  await ensureRuntimeSchema();

  // L3 Redis
  if (redis && !options.skipRedis) {
    try {
      const cached = await redis.get(cacheKey(restaurantId));
      if (cached) {
        return JSON.parse(cached) as PublicSitePayload;
      }
    } catch (e) {
      console.warn("[redis] site read failed:", e);
    }
  }

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT ${SELECT_COLUMNS} FROM restaurants WHERE id = $1 LIMIT 1`,
    restaurantId,
  );
  const row = rows[0];
  if (!row || row.statut === "suspendu") return null;
  const payload = rowToPayload(row);

  // L3 write — best-effort, don't block
  if (redis) {
    redis
      .set(cacheKey(restaurantId), JSON.stringify(payload), "EX", REDIS_TTL_SECONDS)
      .catch((e) => console.warn("[redis] site write failed:", e));
  }

  return payload;
}

/**
 * Charge par slug — si trouvé retourne le payload + l'id pour pouvoir
 * canoniser l'URL (`/site/[id]` → `/site/[slug]`).
 */
export async function getPublicSiteBySlug(
  slug: string,
): Promise<PublicSitePayload | null> {
  await ensureRuntimeSchema();
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT ${SELECT_COLUMNS} FROM restaurants WHERE site_slug = $1 LIMIT 1`,
    slug,
  );
  const row = rows[0];
  if (!row || row.statut === "suspendu") return null;
  return rowToPayload(row);
}

/**
 * Charge soit par ID numérique soit par slug, en une seule fonction
 * pour la route `/site/[idOrSlug]`.
 */
export async function getPublicSiteByIdOrSlug(
  idOrSlug: string,
): Promise<PublicSitePayload | null> {
  if (/^\d+$/.test(idOrSlug)) {
    try {
      return await getPublicSite(BigInt(idOrSlug));
    } catch {
      return null;
    }
  }
  return getPublicSiteBySlug(idOrSlug);
}

/**
 * Invalide le cache Redis L3 pour un resto. Appelé par les server actions
 * après save / toggle.
 */
export async function invalidateSiteCache(restaurantId: bigint): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(cacheKey(restaurantId));
  } catch (e) {
    console.warn("[redis] site invalidate failed:", e);
  }
}

/**
 * Track une vue de site. Async fire-and-forget, ne bloque jamais le rendu.
 * Appelé depuis le composant client via une server action.
 */
export async function trackSiteView(input: {
  restaurantId: bigint;
  userAgent: string | null;
  pays: string | null;
  lang: string | null;
  referer: string | null;
  sectionClicked?: string | null;
}): Promise<void> {
  await ensureRuntimeSchema();
  try {
    await prisma.$executeRaw`
      INSERT INTO site_views (restaurant_id, user_agent, pays, lang, referer, section_clicked)
      VALUES (
        ${input.restaurantId},
        ${input.userAgent},
        ${input.pays},
        ${input.lang},
        ${input.referer},
        ${input.sectionClicked ?? null}
      )
    `;
    await prisma.$executeRaw`
      UPDATE restaurants SET site_views_count = site_views_count + 1 WHERE id = ${input.restaurantId}
    `;
  } catch (e) {
    console.warn("[trackSiteView] failed:", e);
  }
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
    team: c.team,
    faq: c.faq,
  };
}
