import "server-only";
import { prisma } from "@/lib/db";

/**
 * Service d'enrichissement d'un prospect :
 *   1. Tente de récupérer le HTML de la page d'accueil du site
 *   2. Extrait le logo via og:image / apple-touch-icon / favicon
 *   3. Cherche un lien vers le menu (PDF ou page /menu, /carte, /la-carte)
 *   4. Tente d'extraire la couleur dominante (via vibrant si dispo)
 *
 * Toutes les étapes sont best-effort, on stocke ce qu'on trouve et on
 * marque le prospect enrichi même partiellement.
 *
 * Pas d'appel Google Places ici pour rester gratuit sur le pilote :
 * les données TripAdvisor sont déjà très complètes (rating, photos, adresse,
 * téléphone, niveau de prix). On ajoute Places uniquement si site web manquant.
 */

const FETCH_TIMEOUT_MS = 8000;
const MENU_KEYWORDS = ["menu", "carte", "la-carte", "notre-carte", "nos-cartes"];

type EnrichmentResult = {
  logoUrl: string | null;
  menuSourceUrl: string | null;
  menuSourceType: "pdf" | "html" | "image" | null;
  couleurDominante: string | null;
  errors: string[];
};

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // User-agent friendly mais identifiable (transparence RGPD)
        "User-Agent":
          "RulizBot/1.0 (+https://ruliz-panel.fr/bot) Restaurant menu enrichment",
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

function absoluteUrl(maybeRelative: string, baseUrl: string): string | null {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMeta(html: string, property: string): string | null {
  // og:image / og:title / etc.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? (m[1] ?? null) : null;
}

function extractLogo(html: string, baseUrl: string): string | null {
  // Priorité : og:image > apple-touch-icon > icon
  const og = extractMeta(html, "og:image");
  if (og) return absoluteUrl(og, baseUrl);

  const apple = html.match(
    /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
  );
  if (apple && apple[1]) {
    const abs = absoluteUrl(apple[1], baseUrl);
    if (abs) return abs;
  }

  const icon = html.match(
    /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (icon && icon[1]) {
    const abs = absoluteUrl(icon[1], baseUrl);
    if (abs) return abs;
  }

  // Fallback : Google Favicon service (zéro effort, marche tout le temps)
  try {
    const u = new URL(baseUrl);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return null;
  }
}

function extractMenuLink(html: string, baseUrl: string): {
  url: string;
  type: "pdf" | "html" | "image";
} | null {
  // 1) Cherche un lien <a> avec un keyword dans href ou texte
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  const candidates: Array<{ href: string; text: string }> = [];

  while ((match = linkRe.exec(html)) !== null && candidates.length < 200) {
    const href = match[1] ?? "";
    const text = (match[2] ?? "").replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (!href) continue;
    candidates.push({ href, text });
  }

  // Priorité PDF
  for (const c of candidates) {
    if (c.href.toLowerCase().endsWith(".pdf")) {
      const url = absoluteUrl(c.href, baseUrl);
      if (url) return { url, type: "pdf" };
    }
  }

  // Puis liens textuels "menu"/"carte"
  for (const c of candidates) {
    const haystack = `${c.href} ${c.text}`.toLowerCase();
    if (MENU_KEYWORDS.some((k) => haystack.includes(k))) {
      const url = absoluteUrl(c.href, baseUrl);
      if (!url) continue;
      // Détecte type
      const lower = url.toLowerCase();
      if (lower.endsWith(".pdf")) return { url, type: "pdf" };
      if (/\.(png|jpg|jpeg|webp)$/.test(lower)) return { url, type: "image" };
      return { url, type: "html" };
    }
  }

  return null;
}

/**
 * Enrichit un prospect. Update direct en DB.
 * Retourne le résultat pour logs / debug.
 */
export async function enrichProspect(prospectId: bigint): Promise<EnrichmentResult> {
  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { id: prospectId },
    select: { id: true, siteWeb: true, nom: true },
  });

  if (!prospect) {
    throw new Error(`Prospect ${prospectId} not found`);
  }

  const result: EnrichmentResult = {
    logoUrl: null,
    menuSourceUrl: null,
    menuSourceType: null,
    couleurDominante: null,
    errors: [],
  };

  if (!prospect.siteWeb) {
    result.errors.push("no_website");
    await prisma.prospectRestaurant.update({
      where: { id: prospectId },
      data: {
        status: "enriched",
        enrichedAt: new Date(),
        errorMessage: "no_website",
      },
    });
    return result;
  }

  // Normalise URL
  let baseUrl = prospect.siteWeb.trim();
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;

  try {
    const res = await fetchWithTimeout(baseUrl);
    if (!res.ok) {
      result.errors.push(`http_${res.status}`);
    } else {
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        result.errors.push(`not_html_${contentType}`);
      } else {
        const html = await res.text();
        result.logoUrl = extractLogo(html, baseUrl);
        const menu = extractMenuLink(html, baseUrl);
        if (menu) {
          result.menuSourceUrl = menu.url;
          result.menuSourceType = menu.type;
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`fetch_failed:${msg.slice(0, 80)}`);
  }

  // Si rien trouvé, on tombe au moins sur le favicon Google
  if (!result.logoUrl) {
    try {
      const u = new URL(baseUrl);
      result.logoUrl = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
    } catch {
      // pas grave
    }
  }

  await prisma.prospectRestaurant.update({
    where: { id: prospectId },
    data: {
      logoUrl: result.logoUrl,
      menuSourceUrl: result.menuSourceUrl,
      menuSourceType: result.menuSourceType,
      couleurDominante: result.couleurDominante,
      status: "enriched",
      enrichedAt: new Date(),
      errorMessage: result.errors.length > 0 ? result.errors.join(",") : null,
    },
  });

  return result;
}
