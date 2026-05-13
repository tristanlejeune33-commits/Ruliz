/**
 * Mapping ISO-2 country codes → name + emoji flag.
 * Couvre les 50+ pays les plus probables sur la carte d'un restaurant FR.
 * Fallback "🌐 · code" pour les autres.
 */

const COUNTRIES: Record<string, { name: string; flag: string }> = {
  FR: { name: "France", flag: "🇫🇷" },
  BE: { name: "Belgique", flag: "🇧🇪" },
  CH: { name: "Suisse", flag: "🇨🇭" },
  LU: { name: "Luxembourg", flag: "🇱🇺" },
  MC: { name: "Monaco", flag: "🇲🇨" },
  GB: { name: "Royaume-Uni", flag: "🇬🇧" },
  IE: { name: "Irlande", flag: "🇮🇪" },
  DE: { name: "Allemagne", flag: "🇩🇪" },
  AT: { name: "Autriche", flag: "🇦🇹" },
  IT: { name: "Italie", flag: "🇮🇹" },
  ES: { name: "Espagne", flag: "🇪🇸" },
  PT: { name: "Portugal", flag: "🇵🇹" },
  NL: { name: "Pays-Bas", flag: "🇳🇱" },
  SE: { name: "Suède", flag: "🇸🇪" },
  NO: { name: "Norvège", flag: "🇳🇴" },
  DK: { name: "Danemark", flag: "🇩🇰" },
  FI: { name: "Finlande", flag: "🇫🇮" },
  PL: { name: "Pologne", flag: "🇵🇱" },
  CZ: { name: "Tchéquie", flag: "🇨🇿" },
  GR: { name: "Grèce", flag: "🇬🇷" },
  HU: { name: "Hongrie", flag: "🇭🇺" },
  RO: { name: "Roumanie", flag: "🇷🇴" },
  RU: { name: "Russie", flag: "🇷🇺" },
  UA: { name: "Ukraine", flag: "🇺🇦" },
  TR: { name: "Turquie", flag: "🇹🇷" },
  US: { name: "États-Unis", flag: "🇺🇸" },
  CA: { name: "Canada", flag: "🇨🇦" },
  MX: { name: "Mexique", flag: "🇲🇽" },
  BR: { name: "Brésil", flag: "🇧🇷" },
  AR: { name: "Argentine", flag: "🇦🇷" },
  CL: { name: "Chili", flag: "🇨🇱" },
  CO: { name: "Colombie", flag: "🇨🇴" },
  CN: { name: "Chine", flag: "🇨🇳" },
  JP: { name: "Japon", flag: "🇯🇵" },
  KR: { name: "Corée du Sud", flag: "🇰🇷" },
  IN: { name: "Inde", flag: "🇮🇳" },
  ID: { name: "Indonésie", flag: "🇮🇩" },
  TH: { name: "Thaïlande", flag: "🇹🇭" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  PH: { name: "Philippines", flag: "🇵🇭" },
  MY: { name: "Malaisie", flag: "🇲🇾" },
  SG: { name: "Singapour", flag: "🇸🇬" },
  HK: { name: "Hong Kong", flag: "🇭🇰" },
  TW: { name: "Taïwan", flag: "🇹🇼" },
  AE: { name: "Émirats", flag: "🇦🇪" },
  SA: { name: "Arabie Saoudite", flag: "🇸🇦" },
  IL: { name: "Israël", flag: "🇮🇱" },
  EG: { name: "Égypte", flag: "🇪🇬" },
  MA: { name: "Maroc", flag: "🇲🇦" },
  DZ: { name: "Algérie", flag: "🇩🇿" },
  TN: { name: "Tunisie", flag: "🇹🇳" },
  SN: { name: "Sénégal", flag: "🇸🇳" },
  CI: { name: "Côte d'Ivoire", flag: "🇨🇮" },
  ZA: { name: "Afrique du Sud", flag: "🇿🇦" },
  AU: { name: "Australie", flag: "🇦🇺" },
  NZ: { name: "Nouvelle-Zélande", flag: "🇳🇿" },
};

export function countryMeta(code: string | null | undefined): {
  name: string;
  flag: string;
} {
  if (!code) return { name: "Inconnu", flag: "🌐" };
  const upper = code.toUpperCase();
  return COUNTRIES[upper] ?? { name: upper, flag: "🌐" };
}

export const KNOWN_COUNTRY_CODES = Object.keys(COUNTRIES);
