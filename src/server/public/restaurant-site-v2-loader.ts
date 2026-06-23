import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import {
  horairesServiceToHoursRows,
  isHorairesService,
} from "@/lib/horaires-service";
import type {
  HoursRow,
  MenuTeaserItem,
  RestaurantConfig,
  Testimonial,
} from "@/features/restaurant-site-v2/types";

/**
 * Loader v2 — construit un RestaurantConfig complet depuis :
 *   1. Le row Restaurant (branding + adresse + socials + horaires + couleurs)
 *   2. Le JSONB `site_config` (contenu éditorial : about, gallery, testimonials,
 *      options visuelles, hero layout, etc.)
 *   3. La table Categorie/Produit (top 4 produits affichés pour le menu teaser)
 *
 * Toutes les valeurs ont un FALLBACK pour qu'un restaurateur qui active le
 * site sans rien customiser voie quand même un rendu correct (le contenu
 * éditorial reste optionnel et a des défauts sensés).
 *
 * Cache : Redis L3 ("site2:{id}", 30 min TTL). Invalidé manuellement à
 * chaque save côté server action (cf. site-v2-actions.ts).
 */

const REDIS_TTL = 60 * 30;

export interface SiteV2Payload {
  config: RestaurantConfig;
  slug: string | null;
  enabled: boolean;
  plan: "freemium" | "pro" | "premium";
  /** ID du resto pour l'URL canonique / tracking. */
  restaurantId: string;
}

function cacheKey(id: bigint | string): string {
  return `site2:${id.toString()}`;
}

/**
 * Format prix : `12.5` + `€` → `"12,50 €"`. `null` → `"—"`.
 * Format français : virgule décimale, espace insécable avant la devise.
 */
function formatPrice(prix: number | null, devise: string | null): string {
  if (prix === null || prix === undefined) return "—";
  const n = Number(prix);
  if (!Number.isFinite(n)) return "—";
  // toLocaleString gère la virgule + le séparateur de milliers en fr-FR
  const formatted = n.toLocaleString("fr-FR", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${devise ?? "€"}`;
}

/**
 * Convertit l'array `horairesOuverture` text-libre en HoursRow[].
 *
 * Le user saisit un texte libre dans /dashboard/restaurant ; on essaye de
 * détecter les jours et leurs horaires. Si le format n'est pas reconnu,
 * on retombe sur "Mardi-Samedi 12h-15h · 19h-22h30, fermé dimanche-lundi"
 * réparti grossièrement.
 *
 * STRATÉGIE FALLBACK : si le user a un site_config.v2.practical.hours
 * structuré, on le préfère. Sinon, on essaie de parser le texte.
 * Sinon, on génère 7 lignes "—" pour qu'au moins la grille s'affiche.
 */
function parseHoursOuverture(text: string | null): HoursRow[] {
  const days: HoursRow["day"][] = [
    "lun",
    "mar",
    "mer",
    "jeu",
    "ven",
    "sam",
    "dim",
  ];

  if (!text || text.trim().length === 0) {
    return days.map((d) => ({ day: d, hours: "—" }));
  }

  // Cas simple : 7 lignes alignées avec les jours. On regarde si chaque
  // jour apparaît mentionné en début de ligne.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const dayMap: Record<string, string | null> = {};
  const dayRegex =
    /^\s*(lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?)\b[:\s—-]*(.+)?$/i;

  for (const line of lines) {
    const m = dayRegex.exec(line);
    if (m && m[1]) {
      const key = m[1].slice(0, 3).toLowerCase() as HoursRow["day"];
      const val = (m[2] ?? "").trim();
      dayMap[key] = val && !/fermé|closed|ferme/i.test(val) ? val : null;
    }
  }

  // Si on a au moins 3 jours détectés, on considère que le parsing a
  // réussi et on retourne ce qu'on a (jours manquants = "—" non-fermé).
  if (Object.keys(dayMap).length >= 3) {
    return days.map((d) => ({
      day: d,
      hours: dayMap[d] !== undefined ? dayMap[d] : "—",
    }));
  }

  // Sinon : impossible à parser, on affiche le texte brut sur lundi
  // (compromis vs cacher la section)
  return [
    { day: "lun", hours: text.slice(0, 200) },
    ...days.slice(1).map<HoursRow>((d) => ({ day: d, hours: "—" })),
  ];
}

/**
 * Shape du blob JSONB v2 dans `restaurants.site_config`.
 * Champs OPTIONNELS — on construit le RestaurantConfig complet avec
 * fallbacks sur le branding resto si vides.
 */
interface SiteConfigV2Json {
  version: 2;
  tagline?: string;
  established?: number;
  about?: {
    title?: string;
    body?: string[];
    image?: string;
    signature?: string;
  };
  menuTeaser?: {
    title?: string;
    /**
     * IDs des produits à mettre en vitrine (max 4). String car BigInt
     * sérialisable. Si vide ou tous invalides → fallback auto top-4
     * (cf. loader logic).
     */
    productIds?: string[];
  };
  gallery?: string[];
  testimonials?: Testimonial[];
  reservationUrl?: string;
  accentColor?: string; // override le couleurPrimaire du resto
  buttonBgColor?: string; // bg des CTA primary
  buttonTextColor?: string; // texte des CTA primary
  typographyPreset?: "editorial" | "modern" | "classic";
  /** Override des horaires structurées (sinon parsé depuis horairesOuverture). */
  hoursOverride?: HoursRow[];
  options?: {
    showGallery?: boolean;
    showTestimonials?: boolean;
    showReservation?: boolean;
    /** Toggle map Google Maps dans la section Pratique. Default true. */
    showMap?: boolean;
    theme?: "light" | "dark";
    aboutImageLeft?: boolean;
    heroLayout?: "banner" | "split";
  };
}

function isV2(raw: unknown): raw is SiteConfigV2Json {
  return (
    !!raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 2
  );
}

/**
 * Mappe fontStyle (Restaurant model) → typographyPreset (v2 template).
 * "elegant" était la 3e valeur dans le système Ruliz historique → mappée
 * à "classic" (EB Garamond + DM Sans).
 */
function fontStyleToPreset(
  fontStyle: string | null,
): "editorial" | "modern" | "classic" {
  switch (fontStyle) {
    case "modern":
      return "modern";
    case "elegant":
    case "classic":
      return "classic";
    case "editorial":
    default:
      return "editorial";
  }
}

/**
 * Charge le payload v2 par ID. Slug → ID résolu d'abord par caller.
 */
export async function loadSiteV2(
  restaurantId: bigint,
  options: { skipRedis?: boolean } = {},
): Promise<SiteV2Payload | null> {
  await ensureRuntimeSchema();

  // L3 Redis
  if (redis && !options.skipRedis) {
    try {
      const cached = await redis.get(cacheKey(restaurantId));
      if (cached) {
        return JSON.parse(cached) as SiteV2Payload;
      }
    } catch (e) {
      console.warn("[redis] site v2 read failed:", e);
    }
  }

  // === Restaurant row ===
  type RestoRow = {
    id: bigint;
    nom: string;
    description: string | null;
    logoUrl: string | null;
    banniereUrl: string | null;
    couleurPrimaire: string | null;
    fontStyle: string | null;
    theme: string | null;
    ville: string | null;
    pays: string | null;
    codePostal: string | null;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
    horairesOuverture: string | null;
    horairesService: unknown;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    siteWeb: string | null;
    googleReviewUrl: string | null;
    deviseDefault: string | null;
    statut: string;
    plan: string;
    site_enabled: boolean | null;
    site_config: unknown;
    site_slug: string | null;
    createdAt: Date;
  };
  const restoRows = await prisma.$queryRawUnsafe<RestoRow[]>(
    `
    SELECT
      id,
      nom,
      description,
      logo_url            AS "logoUrl",
      banniere_url        AS "banniereUrl",
      couleur_primaire    AS "couleurPrimaire",
      font_style          AS "fontStyle",
      theme,
      ville,
      pays,
      code_postal         AS "codePostal",
      adresse,
      telephone,
      email,
      horaires_ouverture  AS "horairesOuverture",
      horaires_service    AS "horairesService",
      facebook_url        AS "facebookUrl",
      instagram_url       AS "instagramUrl",
      tiktok_url          AS "tiktokUrl",
      site_web            AS "siteWeb",
      google_review_url   AS "googleReviewUrl",
      devise_default      AS "deviseDefault",
      statut,
      plan,
      site_enabled,
      site_config,
      site_slug,
      created_at          AS "createdAt"
    FROM restaurants
    WHERE id = $1
    LIMIT 1
  `,
    restaurantId,
  );

  const resto = restoRows[0];
  if (!resto || resto.statut === "suspendu") return null;

  // === Parse site_config JSONB en v2 ===
  // Lu EN PREMIER pour savoir si vitrine custom ou auto top-4
  const v2Raw = resto.site_config;
  const v2 = isV2(v2Raw) ? v2Raw : null;

  // === Produits pour menuTeaser ===
  type ProduitRow = {
    id: bigint;
    titre: string;
    prix: number | null;
    devise: string | null;
    imageUrl: string | null;
  };

  // Si le restaurateur a sélectionné des produits VITRINE, on les fetch
  // par leurs IDs (max 4) et on préserve l'ordre choisi.
  // Sinon fallback : top 4 produits visibles toutes catégories confondues
  // (cf. logique historique).
  const pickedIds = v2?.menuTeaser?.productIds ?? [];
  let produits: ProduitRow[] = [];

  if (pickedIds.length > 0) {
    // Parse les IDs en BigInt, ignore les invalides
    const bigIds: bigint[] = [];
    for (const id of pickedIds.slice(0, 4)) {
      try {
        bigIds.push(BigInt(id));
      } catch {
        // ignore IDs malformés
      }
    }
    if (bigIds.length > 0) {
      // Fetch en bulk
      const fetched = await prisma.$queryRawUnsafe<ProduitRow[]>(
        `
        SELECT
          p.id,
          p.titre,
          p.prix::float AS "prix",
          p.devise,
          p.image_url   AS "imageUrl"
        FROM produits p
        JOIN categories c ON c.id = p.categorie_id
        WHERE c.restaurant_id = $1
          AND p.id = ANY($2::bigint[])
          AND p.statut = 'affiche'
        `,
        restaurantId,
        bigIds,
      );
      // Réordonne selon l'ordre de pickedIds (les IDs invalides/disparus
      // sont juste skippés silencieusement)
      const byId = new Map(fetched.map((p) => [p.id.toString(), p]));
      produits = bigIds
        .map((b) => byId.get(b.toString()))
        .filter((p): p is ProduitRow => Boolean(p));
    }
  }

  // Fallback auto si rien de sélectionné ou tous invalides
  if (produits.length === 0) {
    produits = await prisma.$queryRawUnsafe<ProduitRow[]>(
      `
      SELECT
        p.id,
        p.titre,
        p.prix::float AS "prix",
        p.devise,
        p.image_url   AS "imageUrl"
      FROM produits p
      JOIN categories c ON c.id = p.categorie_id
      WHERE c.restaurant_id = $1
        AND p.statut = 'affiche'
        AND c.affiche = true
      ORDER BY c.position ASC, p.position ASC
      LIMIT 4
      `,
      restaurantId,
    );
  }

  // === Build RestaurantConfig avec fallbacks ===
  const restaurantName = resto.nom;
  const tagline =
    v2?.tagline ??
    resto.description ??
    "Cuisine de saison, produits du marché.";
  const accentColor =
    v2?.accentColor ?? resto.couleurPrimaire ?? "#6b2a18";
  const typographyPreset =
    v2?.typographyPreset ?? fontStyleToPreset(resto.fontStyle);
  const theme =
    v2?.options?.theme ?? (resto.theme === "dark" ? "dark" : "light");
  const city = resto.ville ?? "";
  const established =
    v2?.established ?? new Date(resto.createdAt).getFullYear();

  // About
  const about = {
    title: v2?.about?.title ?? `${restaurantName}, en quelques mots.`,
    body:
      v2?.about?.body && v2.about.body.length > 0
        ? v2.about.body
        : [
            resto.description ??
              "Notre maison vous accueille pour partager le meilleur de la cuisine de saison, dans un cadre soigné.",
          ],
    // Pas de fausse photo : la bannière du resto si dispo, sinon null
    // (placeholder neutre côté composant). On n'injecte JAMAIS d'image stock.
    image: v2?.about?.image ?? resto.banniereUrl ?? null,
    signature: v2?.about?.signature,
  };

  // Menu teaser — uniquement les VRAIS produits. Pas d'image stock, pas de
  // padding "À venir" : si le resto n'a rien, la section ne s'affiche pas.
  const menuTeaserItems: MenuTeaserItem[] = produits.map((p, idx) => ({
    num: idx + 1,
    name: p.titre,
    // Devise du resto = source de vérité (un resto = une devise), comme la carte.
    price: formatPrice(p.prix, resto.deviseDefault),
    image: p.imageUrl ?? null,
  }));
  const menuTeaser = {
    title: v2?.menuTeaser?.title ?? "Une carte vivante, tenue avec soin.",
    items: menuTeaserItems,
    productIds: pickedIds,
  };

  // Gallery
  const gallery = v2?.gallery && v2.gallery.length > 0 ? v2.gallery : [];

  // Testimonials
  const testimonials = v2?.testimonials ?? [];

  // Adresse + Google Maps URL
  const addressParts = [
    resto.adresse,
    [resto.codePostal, resto.ville].filter(Boolean).join(" "),
  ].filter(Boolean);
  const address = addressParts.join(", ") || "Adresse à venir";
  const googleMapsUrl = resto.adresse
    ? `https://www.google.com/maps/search/${encodeURIComponent(
        [resto.adresse, resto.codePostal, resto.ville, resto.pays]
          .filter(Boolean)
          .join(" "),
      )}`
    : "https://www.google.com/maps";

  // Hours — priorité :
  //   1. v2.hoursOverride dans site_config (legacy, peu utilisé)
  //   2. restaurants.horaires_service (JSONB structuré, source canonique)
  //   3. parsing du texte legacy horaires_ouverture (best-effort)
  //   4. fallback array "—" 7 jours
  let hours: HoursRow[];
  if (v2?.hoursOverride) {
    hours = v2.hoursOverride;
  } else if (isHorairesService(resto.horairesService)) {
    hours = horairesServiceToHoursRows(resto.horairesService) as HoursRow[];
  } else {
    hours = parseHoursOuverture(resto.horairesOuverture);
  }

  // Reservation URL : config v2 > restaurant.siteWeb (peu probable mais fallback) > null
  const reservationUrl = v2?.reservationUrl ?? null;

  const config: RestaurantConfig = {
    restaurantName,
    tagline,
    logoUrl: resto.logoUrl,
    bannerUrl: resto.banniereUrl,
    heroImage: resto.banniereUrl ?? undefined,
    accentColor,
    buttonBgColor: v2?.buttonBgColor,
    buttonTextColor: v2?.buttonTextColor,
    typographyPreset,
    city,
    established,
    about,
    menuTeaser,
    gallery,
    testimonials,
    practical: {
      address,
      phone: resto.telephone ?? "",
      email: resto.email ?? "",
      hours,
      googleMapsUrl,
    },
    socials: {
      instagram: resto.instagramUrl ?? null,
      facebook: resto.facebookUrl ?? null,
      tiktok: resto.tiktokUrl ?? null,
    },
    reservationUrl,
    menuUrl: resto.site_slug
      ? `/carte/${restaurantId.toString()}`
      : `/carte/${restaurantId.toString()}`,
    options: {
      showGallery: v2?.options?.showGallery ?? gallery.length > 0,
      showTestimonials:
        v2?.options?.showTestimonials ?? testimonials.length > 0,
      showReservation: v2?.options?.showReservation ?? reservationUrl !== null,
      // Default true → rétrocompat des sites existants qui voient la map.
      // L'utilisateur peut désactiver explicitement via le toggle des
      // paramètres site.
      showMap: v2?.options?.showMap ?? true,
      theme,
      aboutImageLeft: v2?.options?.aboutImageLeft ?? true,
      heroLayout: v2?.options?.heroLayout ?? "banner",
    },
  };

  const payload: SiteV2Payload = {
    config,
    slug: resto.site_slug,
    enabled: Boolean(resto.site_enabled),
    plan: (resto.plan as "freemium" | "pro" | "premium") ?? "freemium",
    restaurantId: restaurantId.toString(),
  };

  // L3 write
  if (redis) {
    redis
      .set(cacheKey(restaurantId), JSON.stringify(payload), "EX", REDIS_TTL)
      .catch((e) => console.warn("[redis] site v2 write failed:", e));
  }

  return payload;
}

/**
 * Charge par slug → résout l'id en interne puis appelle loadSiteV2.
 */
export async function loadSiteV2BySlug(
  slug: string,
): Promise<SiteV2Payload | null> {
  await ensureRuntimeSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `SELECT id FROM restaurants WHERE site_slug = $1 LIMIT 1`,
    slug,
  );
  const id = rows[0]?.id;
  if (!id) return null;
  return loadSiteV2(id);
}

/**
 * Accepte ID numérique OU slug.
 */
export async function loadSiteV2ByIdOrSlug(
  idOrSlug: string,
): Promise<SiteV2Payload | null> {
  if (/^\d+$/.test(idOrSlug)) {
    try {
      return await loadSiteV2(BigInt(idOrSlug));
    } catch {
      return null;
    }
  }
  return loadSiteV2BySlug(idOrSlug);
}

/**
 * Invalide le cache Redis L3 pour un resto. Appelé après chaque save.
 */
export async function invalidateSiteV2Cache(restaurantId: bigint): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(cacheKey(restaurantId));
  } catch (e) {
    console.warn("[redis] site v2 invalidate failed:", e);
  }
}
