import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { translateSiteConfig } from "@/server/public/translate-site";
import type { SupportedLang } from "@/lib/langs";
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

/**
 * Clé cache Redis. La lang fait partie de la clé car on cache des payloads
 * pré-traduits — éviter de re-payer Anthropic à chaque vue.
 * 50 restos × 7 langs = 350 entrées max × ~5KB = 1.75MB Redis (négligeable).
 */
function cacheKey(restaurantId: bigint | string, lang: SupportedLang = "fr"): string {
  return `site:${restaurantId.toString()}:${lang}`;
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
  /** Lang du contenu traduit. "fr" = source. */
  lang: SupportedLang;
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
  codePostal: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  horairesOuverture: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  siteWeb: string | null;
  googleReviewUrl: string | null;
  // Google Reviews cache
  googleRating: number | null | string; // Prisma renvoie Decimal en string
  googleReviewsCount: number | null;
  googleReviewsJson: unknown;
  googleReviewsRefreshedAt: Date | null;
  statut: string;
  plan: string;
  site_enabled: boolean | null;
  site_config: unknown;
  site_slug: string | null;
};

function rowToPayload(row: Row, lang: SupportedLang = "fr"): PublicSitePayload {
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
    codePostal: row.codePostal,
    adresse: row.adresse,
    telephone: row.telephone,
    email: row.email,
    horairesOuverture: row.horairesOuverture,
    facebookUrl: row.facebookUrl,
    instagramUrl: row.instagramUrl,
    tiktokUrl: row.tiktokUrl,
    siteWeb: row.siteWeb,
    googleReviewUrl: row.googleReviewUrl,
    // Google Reviews — Decimal Postgres revient en string, on convertit
    googleRating:
      row.googleRating !== null && row.googleRating !== undefined
        ? Number(row.googleRating)
        : null,
    googleReviewsCount: row.googleReviewsCount ?? null,
    googleReviews: Array.isArray(row.googleReviewsJson)
      ? (row.googleReviewsJson as Array<{
          author_name: string;
          author_url?: string;
          profile_photo_url?: string;
          rating: number;
          text: string;
          relative_time_description: string;
          time: number;
          language?: string;
        }>)
      : [],
    googleReviewsRefreshedAt: row.googleReviewsRefreshedAt
      ? row.googleReviewsRefreshedAt.toISOString()
      : null,
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
    lang,
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
  code_postal        AS "codePostal",
  adresse,
  telephone,
  email,
  horaires_ouverture AS "horairesOuverture",
  facebook_url       AS "facebookUrl",
  instagram_url      AS "instagramUrl",
  tiktok_url         AS "tiktokUrl",
  site_web           AS "siteWeb",
  google_review_url  AS "googleReviewUrl",
  google_rating               AS "googleRating",
  google_reviews_count        AS "googleReviewsCount",
  google_reviews_json         AS "googleReviewsJson",
  google_reviews_refreshed_at AS "googleReviewsRefreshedAt",
  statut,
  plan,
  site_enabled,
  site_config,
  site_slug
`;

/**
 * Charge le payload public d'un resto par ID numérique.
 *
 * @param options.lang     Lang du payload retourné. Si != "fr", on traduit
 *                         le config via Anthropic (cache DB partagé).
 *                         Cache Redis séparé par lang.
 * @param options.skipRedis Bypass L3 cache (utile dans la preview dashboard
 *                          pour voir tout de suite la dernière sauvegarde
 *                          sans attendre l'expiration TTL).
 */
export async function getPublicSite(
  restaurantId: bigint,
  options: { skipRedis?: boolean; lang?: SupportedLang } = {},
): Promise<PublicSitePayload | null> {
  await ensureRuntimeSchema();
  const lang = options.lang ?? "fr";

  // L3 Redis (clé par lang)
  if (redis && !options.skipRedis) {
    try {
      const cached = await redis.get(cacheKey(restaurantId, lang));
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
  let payload = rowToPayload(row, lang);

  // Traduction si nécessaire — uniquement si site_enabled (économise les
  // tokens Anthropic pour les restos qui ne montrent pas leur site)
  if (lang !== "fr" && payload.enabled) {
    try {
      const translatedConfig = await translateSiteConfig(payload.config, lang);
      payload = { ...payload, config: translatedConfig };
    } catch (e) {
      console.warn(`[getPublicSite] translate ${lang} failed, falling back to fr:`, e);
      // En cas d'échec Anthropic → renvoie le FR (pas de page cassée)
    }
  }

  // L3 write — best-effort, don't block
  if (redis) {
    redis
      .set(
        cacheKey(restaurantId, lang),
        JSON.stringify(payload),
        "EX",
        REDIS_TTL_SECONDS,
      )
      .catch((e) => console.warn("[redis] site write failed:", e));
  }

  return payload;
}

/**
 * Charge par slug — si trouvé retourne le payload + l'id pour pouvoir
 * canoniser l'URL (`/site/[id]` → `/site/[slug]`).
 *
 * On utilise getPublicSite(id) en interne après avoir résolu l'id depuis
 * le slug, pour profiter du cache + de la traduction.
 */
export async function getPublicSiteBySlug(
  slug: string,
  options: { lang?: SupportedLang } = {},
): Promise<PublicSitePayload | null> {
  await ensureRuntimeSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `SELECT id FROM restaurants WHERE site_slug = $1 LIMIT 1`,
    slug,
  );
  const id = rows[0]?.id;
  if (!id) return null;
  return getPublicSite(id, options);
}

/**
 * Charge soit par ID numérique soit par slug, en une seule fonction
 * pour la route `/site/[idOrSlug]`.
 */
export async function getPublicSiteByIdOrSlug(
  idOrSlug: string,
  options: { lang?: SupportedLang } = {},
): Promise<PublicSitePayload | null> {
  if (/^\d+$/.test(idOrSlug)) {
    try {
      return await getPublicSite(BigInt(idOrSlug), options);
    } catch {
      return null;
    }
  }
  return getPublicSiteBySlug(idOrSlug, options);
}

/**
 * Invalide le cache Redis L3 pour un resto. Appelé par les server actions
 * après save / toggle.
 *
 * Invalide TOUTES les langs (site:{id}:fr, site:{id}:en, ...) car la
 * traduction est dérivée du config source.
 */
export async function invalidateSiteCache(restaurantId: bigint): Promise<void> {
  if (!redis) return;
  const langs: SupportedLang[] = ["fr", "en", "es", "de", "it", "pt", "zh"];
  try {
    await Promise.all(langs.map((l) => redis.del(cacheKey(restaurantId, l))));
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
    googleReviews: c.googleReviews,
  };
}
