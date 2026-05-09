/**
 * Public language constants — safe to import in Client Components.
 * The server-only translation logic lives in `src/server/translation/`.
 */
export const SUPPORTED_LANGS = ["fr", "en", "es", "de", "it", "pt", "zh"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/**
 * Métadonnées par langue.
 * - `name` : nom natif
 * - `flag` : emoji (gardé pour fallback / strings i18n / contextes texte)
 * - `country` : ISO 3166-1 alpha-2 — utilisé par <FlagIcon> pour les images
 *   SVG (en utilise `gb` UK, zh utilise `cn` Chine).
 */
export const LANG_META: Record<
  SupportedLang,
  { name: string; flag: string; country: string }
> = {
  fr: { name: "Français", flag: "🇫🇷", country: "fr" },
  en: { name: "English", flag: "🇬🇧", country: "gb" },
  es: { name: "Español", flag: "🇪🇸", country: "es" },
  de: { name: "Deutsch", flag: "🇩🇪", country: "de" },
  it: { name: "Italiano", flag: "🇮🇹", country: "it" },
  pt: { name: "Português", flag: "🇵🇹", country: "pt" },
  zh: { name: "中文", flag: "🇨🇳", country: "cn" },
};

export function isSupportedLang(value: string | null | undefined): value is SupportedLang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export function langLabel(lang: SupportedLang) {
  return LANG_META[lang].name;
}

export function langCountryCode(lang: SupportedLang) {
  return LANG_META[lang].country;
}
