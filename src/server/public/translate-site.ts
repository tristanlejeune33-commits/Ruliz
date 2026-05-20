import "server-only";
import { translatePanelBatch } from "@/server/dashboard/translate-panel-actions";
import { isSupportedLang, type SupportedLang } from "@/lib/langs";
import type {
  RestaurantSiteConfig,
  GalleryItem,
  TestimonialItem,
  TeamMember,
  FaqItem,
} from "@/features/restaurant-site/types";

/**
 * Traduction côté serveur du contenu du mini-site.
 *
 * Stratégie :
 *   1. Recursivement, collecter TOUS les champs textuels traduisibles du
 *      config (hero.title, about.text, gallery[].caption, etc.)
 *   2. Filtrer les doublons + les chaînes vides (économie d'API calls)
 *   3. Appeler translatePanelBatch (qui hit le cache DB + Anthropic Haiku)
 *   4. Reconstruire le config avec les traductions appliquées
 *
 * Champs NON traduits :
 *   - URLs (ctaUrl, imageUrl, videoUrl, mapsUrl, reservation.url…)
 *   - Téléphones, emails
 *   - Noms propres (testimonials[].name, team[].name, source, date)
 *   - Slugs
 *   - Couleurs hex, paramètres de style
 *   - Note (rating) — c'est un nombre
 *
 * Le rendu est SEO-friendly : Google indexe le HTML traduit (vs un
 * AutoTranslateWrapper client-side qui ne traduirait qu'après hydratation).
 */

interface FieldPath {
  /** Une string qui décrit où ranger la valeur traduite. */
  set: (translated: string) => void;
  /** La valeur originale FR. */
  source: string;
}

/**
 * Collecte les paires (source, setter) — on mutera ensuite via les setters.
 */
function collectTranslatablePaths(
  config: RestaurantSiteConfig,
  out: FieldPath[],
): void {
  // Hero — title et eyebrow sont souvent juste le nom du resto. On laisse
  // la décision au prompt Anthropic (qui garde les noms propres).
  if (config.hero.title) {
    out.push({
      source: config.hero.title,
      set: (t) => (config.hero.title = t),
    });
  }
  if (config.hero.subtitle) {
    out.push({
      source: config.hero.subtitle,
      set: (t) => (config.hero.subtitle = t),
    });
  }
  if (config.hero.eyebrow) {
    out.push({
      source: config.hero.eyebrow,
      set: (t) => (config.hero.eyebrow = t),
    });
  }
  if (config.hero.ctaLabel) {
    out.push({
      source: config.hero.ctaLabel,
      set: (t) => (config.hero.ctaLabel = t),
    });
  }

  // About
  if (config.about?.title) {
    const about = config.about;
    out.push({ source: about.title, set: (t) => (about.title = t) });
  }
  if (config.about?.text) {
    const about = config.about;
    out.push({ source: about.text, set: (t) => (about.text = t) });
  }

  // Menu teaser
  if (config.menuTeaser?.title) {
    const mt = config.menuTeaser;
    out.push({ source: mt.title, set: (t) => (mt.title = t) });
  }
  if (config.menuTeaser?.subtitle) {
    const mt = config.menuTeaser;
    out.push({ source: mt.subtitle, set: (t) => (mt.subtitle = t) });
  }
  if (config.menuTeaser?.ctaLabel) {
    const mt = config.menuTeaser;
    out.push({ source: mt.ctaLabel, set: (t) => (mt.ctaLabel = t) });
  }

  // Gallery
  if (Array.isArray(config.gallery)) {
    for (const item of config.gallery as GalleryItem[]) {
      if (item.caption) {
        out.push({ source: item.caption, set: (t) => (item.caption = t) });
      }
      if (item.alt) {
        out.push({ source: item.alt, set: (t) => (item.alt = t) });
      }
    }
  }

  // Testimonials : on traduit text et source (Google → "Google" stays),
  // mais PAS le name (Marie L. reste Marie L.)
  if (Array.isArray(config.testimonials)) {
    for (const item of config.testimonials as TestimonialItem[]) {
      if (item.text) {
        out.push({ source: item.text, set: (t) => (item.text = t) });
      }
      // date reste tel quel (Mai 2026, etc.) — pourrait être traduit mais
      // moins prioritaire et risque de casser des formats
    }
  }

  // Team : role et bio (name reste inchangé)
  if (Array.isArray(config.team)) {
    for (const member of config.team as TeamMember[]) {
      if (member.role) {
        out.push({ source: member.role, set: (t) => (member.role = t) });
      }
      if (member.bio) {
        out.push({ source: member.bio, set: (t) => (member.bio = t) });
      }
    }
  }

  // FAQ
  if (Array.isArray(config.faq)) {
    for (const item of config.faq as FaqItem[]) {
      if (item.question) {
        out.push({ source: item.question, set: (t) => (item.question = t) });
      }
      if (item.answer) {
        out.push({ source: item.answer, set: (t) => (item.answer = t) });
      }
    }
  }

  // Practical : juste schedule (les phone/email sont des données)
  if (config.practical?.schedule) {
    const p = config.practical;
    out.push({ source: p.schedule, set: (t) => (p.schedule = t) });
  }

  // Reservation : label CTA
  if (config.reservation?.label) {
    const r = config.reservation;
    out.push({ source: r.label, set: (t) => (r.label = t) });
  }

  // SEO
  if (config.seo?.title) {
    const seo = config.seo;
    out.push({ source: seo.title, set: (t) => (seo.title = t) });
  }
  if (config.seo?.description) {
    const seo = config.seo;
    out.push({ source: seo.description, set: (t) => (seo.description = t) });
  }
}

/**
 * Traduit un config complet vers `lang`. Retourne un NOUVEAU config (deep
 * clone) — n'altère pas l'original.
 *
 * Si `lang === "fr"` ou non supporté → retourne l'original tel quel
 * (économie d'API calls, et fr est la lang source).
 *
 * Performance :
 *   - Collecte des strings : ~30-100 strings selon le remplissage
 *   - Dédup : généralement -20% (titres répétés)
 *   - translatePanelBatch : DB cache hit instantané, miss = Haiku call
 *   - Première fois pour un site en EN : ~3-5s (60 strings × 50ms moyenne
 *     avec concurrence 20). Ensuite : <50ms via cache DB.
 */
export async function translateSiteConfig(
  config: RestaurantSiteConfig,
  lang: string,
): Promise<RestaurantSiteConfig> {
  if (!isSupportedLang(lang) || lang === "fr") {
    return config;
  }

  // Deep clone — JSON.stringify suffit, le config est pur JSON serializable
  const cloned: RestaurantSiteConfig = JSON.parse(JSON.stringify(config));

  const paths: FieldPath[] = [];
  collectTranslatablePaths(cloned, paths);

  // Dédup les strings (un même titre apparaissant 2x ne consomme qu'1 token)
  const uniqueSources = Array.from(
    new Set(paths.map((p) => p.source).filter((s) => s.trim().length > 0)),
  );

  if (uniqueSources.length === 0) {
    return cloned;
  }

  const translations = await translatePanelBatch(uniqueSources, lang);

  // Apply translations
  for (const path of paths) {
    const translated = translations[path.source];
    if (translated && translated !== path.source) {
      path.set(translated);
    }
  }

  return cloned;
}

/**
 * Détermine la lang à utiliser pour rendre le site, par ordre de priorité :
 *   1. ?lang=xx dans l'URL (explicit user choice)
 *   2. Accept-Language header
 *   3. "fr" (default)
 */
export function detectSiteLang(
  searchParamLang: string | undefined,
  acceptLanguageHeader: string | null,
): SupportedLang {
  if (searchParamLang && isSupportedLang(searchParamLang)) {
    return searchParamLang as SupportedLang;
  }
  if (acceptLanguageHeader) {
    const first = acceptLanguageHeader
      .split(",")[0]
      ?.split("-")[0]
      ?.toLowerCase();
    if (first && isSupportedLang(first)) {
      return first as SupportedLang;
    }
  }
  return "fr";
}
