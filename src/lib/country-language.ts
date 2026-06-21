/**
 * Mapping pays → langue native pour pré-remplir langueNative au signup.
 *
 * On ne couvre que les langues supportées par Ruliz (cf. lib/langs.ts).
 * Si un pays n'est pas listé → fallback "fr" (audience principale FR).
 */

import type { SupportedLang } from "./langs";

/** Liste des pays affichés dans le picker du signup. */
export const SIGNUP_COUNTRIES: Array<{
  code: string;
  flag: string;
  name: string;
  language: SupportedLang;
}> = [
  { code: "FR", flag: "🇫🇷", name: "France", language: "fr" },
  { code: "BE", flag: "🇧🇪", name: "Belgique", language: "fr" },
  { code: "CH", flag: "🇨🇭", name: "Suisse", language: "fr" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg", language: "fr" },
  { code: "CA", flag: "🇨🇦", name: "Canada", language: "fr" },
  { code: "MC", flag: "🇲🇨", name: "Monaco", language: "fr" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", language: "en" },
  { code: "US", flag: "🇺🇸", name: "United States", language: "en" },
  { code: "IE", flag: "🇮🇪", name: "Ireland", language: "en" },
  { code: "AU", flag: "🇦🇺", name: "Australia", language: "en" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", language: "en" },
  { code: "ES", flag: "🇪🇸", name: "España", language: "es" },
  { code: "MX", flag: "🇲🇽", name: "México", language: "es" },
  { code: "AR", flag: "🇦🇷", name: "Argentina", language: "es" },
  { code: "CO", flag: "🇨🇴", name: "Colombia", language: "es" },
  { code: "PE", flag: "🇵🇪", name: "Perú", language: "es" },
  { code: "DE", flag: "🇩🇪", name: "Deutschland", language: "de" },
  { code: "AT", flag: "🇦🇹", name: "Österreich", language: "de" },
  { code: "IT", flag: "🇮🇹", name: "Italia", language: "it" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", language: "pt" },
  { code: "BR", flag: "🇧🇷", name: "Brasil", language: "pt" },
  { code: "CN", flag: "🇨🇳", name: "中国", language: "zh" },
  { code: "TW", flag: "🇹🇼", name: "台灣", language: "zh" },
  { code: "HK", flag: "🇭🇰", name: "香港", language: "zh" },
];

/** Retourne la langue native d'un code pays ISO 2 (FR, IT, etc.). */
export function languageFromCountry(countryCode: string | null | undefined): SupportedLang {
  if (!countryCode) return "fr";
  const upper = countryCode.toUpperCase();
  const found = SIGNUP_COUNTRIES.find((c) => c.code === upper);
  return found?.language ?? "fr";
}

/**
 * Langue de carte par défaut au signup pour un code pays détecté.
 *
 * Différence avec languageFromCountry : si le pays détecté n'a PAS de langue
 * supportée par Ruliz (ex: Turquie → pas de turc), on retombe sur l'ANGLAIS
 * (et pas le français) — c'est la langue internationale par défaut quand on
 * n'a pas la traduction. `null` (aucun pays détecté) → "fr" (audience FR).
 */
export function signupLanguageForCountry(
  countryCode: string | null | undefined,
): SupportedLang {
  if (!countryCode) return "fr";
  const found = SIGNUP_COUNTRIES.find(
    (c) => c.code === countryCode.toUpperCase(),
  );
  return found?.language ?? "en";
}

/** True si le pays figure déjà dans le picker de langues supportées. */
export function isSupportedSignupCountry(
  countryCode: string | null | undefined,
): boolean {
  if (!countryCode) return false;
  return SIGNUP_COUNTRIES.some((c) => c.code === countryCode.toUpperCase());
}

/** Retourne le nom complet d'un pays par son code ISO 2 */
export function countryName(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  const upper = countryCode.toUpperCase();
  const found = SIGNUP_COUNTRIES.find((c) => c.code === upper);
  return found?.name ?? upper;
}

/**
 * Premier pays du picker correspondant à une langue (ex: "en" → "GB").
 * Sert à pré-sélectionner le pays du signup depuis la langue du navigateur.
 * null si la langue n'est pas supportée.
 */
export function defaultCountryForLanguage(
  lang: string | null | undefined,
): string | null {
  if (!lang) return null;
  const code = lang.split("-")[0]?.toLowerCase();
  const found = SIGNUP_COUNTRIES.find((c) => c.language === code);
  return found?.code ?? null;
}
