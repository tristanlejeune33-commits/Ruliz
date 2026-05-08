/**
 * Public language constants — safe to import in Client Components.
 * The server-only translation logic lives in `src/server/translation/`.
 */
export const SUPPORTED_LANGS = ["fr", "en", "es", "de", "it", "pt", "zh"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_META: Record<SupportedLang, { name: string; flag: string }> = {
  fr: { name: "Français", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Español", flag: "🇪🇸" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  it: { name: "Italiano", flag: "🇮🇹" },
  pt: { name: "Português", flag: "🇵🇹" },
  zh: { name: "中文", flag: "🇨🇳" },
};

export function isSupportedLang(value: string | null | undefined): value is SupportedLang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export function langLabel(lang: SupportedLang) {
  return LANG_META[lang].name;
}
