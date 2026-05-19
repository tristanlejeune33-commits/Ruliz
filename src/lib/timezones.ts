/**
 * Liste des fuseaux horaires IANA proposés dans le sélecteur restaurant.
 *
 * On ne charge PAS la liste complète (400+ entrées). On garde les TZ les
 * plus utiles pour Ruliz : Europe + Pacific (NZ, Australie) + grandes
 * villes Amérique/Asie.
 *
 * Le restaurateur peut taper une autre TZ libre si elle n'est pas dans la
 * liste (champ Combobox), Intl.DateTimeFormat le validera.
 */

export interface TimezoneOption {
  /** IANA TZ ID (ex: "Europe/Paris") */
  value: string;
  /** Label affiché dans le sélecteur */
  label: string;
  /** Région pour grouper dans le sélecteur */
  region: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // Europe (priorité)
  { value: "Europe/Paris", label: "Paris (UTC+1/+2)", region: "Europe" },
  { value: "Europe/London", label: "Londres (UTC+0/+1)", region: "Europe" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Rome", label: "Rome (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Lisbon", label: "Lisbonne (UTC+0/+1)", region: "Europe" },
  { value: "Europe/Brussels", label: "Bruxelles (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Amsterdam (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Zurich", label: "Zürich (UTC+1/+2)", region: "Europe" },
  { value: "Europe/Athens", label: "Athènes (UTC+2/+3)", region: "Europe" },

  // Outre-mer France
  { value: "Indian/Reunion", label: "La Réunion (UTC+4)", region: "Outre-mer France" },
  { value: "America/Martinique", label: "Martinique (UTC-4)", region: "Outre-mer France" },
  { value: "America/Guadeloupe", label: "Guadeloupe (UTC-4)", region: "Outre-mer France" },
  { value: "Pacific/Tahiti", label: "Tahiti (UTC-10)", region: "Outre-mer France" },
  { value: "Pacific/Noumea", label: "Nouvelle-Calédonie (UTC+11)", region: "Outre-mer France" },

  // Amérique
  { value: "America/New_York", label: "New York (UTC-5/-4)", region: "Amérique" },
  { value: "America/Chicago", label: "Chicago (UTC-6/-5)", region: "Amérique" },
  { value: "America/Denver", label: "Denver (UTC-7/-6)", region: "Amérique" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/-7)", region: "Amérique" },
  { value: "America/Toronto", label: "Toronto (UTC-5/-4)", region: "Amérique" },
  { value: "America/Mexico_City", label: "Mexico (UTC-6/-5)", region: "Amérique" },
  { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)", region: "Amérique" },

  // Asie
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)", region: "Asie" },
  { value: "Asia/Shanghai", label: "Shanghai (UTC+8)", region: "Asie" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)", region: "Asie" },
  { value: "Asia/Singapore", label: "Singapour (UTC+8)", region: "Asie" },
  { value: "Asia/Seoul", label: "Séoul (UTC+9)", region: "Asie" },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)", region: "Asie" },
  { value: "Asia/Dubai", label: "Dubaï (UTC+4)", region: "Asie" },

  // Océanie (clients NZ ciblés !)
  { value: "Pacific/Auckland", label: "Auckland NZ (UTC+12/+13) ⭐", region: "Océanie" },
  { value: "Pacific/Wellington", label: "Wellington NZ (UTC+12/+13)", region: "Océanie" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/+11)", region: "Océanie" },
  { value: "Australia/Melbourne", label: "Melbourne (UTC+10/+11)", region: "Océanie" },
  { value: "Australia/Perth", label: "Perth (UTC+8)", region: "Océanie" },
  { value: "Australia/Brisbane", label: "Brisbane (UTC+10)", region: "Océanie" },

  // Afrique
  { value: "Africa/Casablanca", label: "Casablanca (UTC+1)", region: "Afrique" },
  { value: "Africa/Algiers", label: "Alger (UTC+1)", region: "Afrique" },
  { value: "Africa/Tunis", label: "Tunis (UTC+1)", region: "Afrique" },
  { value: "Africa/Cairo", label: "Le Caire (UTC+2/+3)", region: "Afrique" },
  { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)", region: "Afrique" },

  // UTC fallback
  { value: "UTC", label: "UTC (sans DST)", region: "Universal" },
];

/** Regroupe les options par région pour les <SelectGroup> shadcn */
export function groupTimezonesByRegion(): Record<string, TimezoneOption[]> {
  const groups: Record<string, TimezoneOption[]> = {};
  for (const tz of TIMEZONE_OPTIONS) {
    const region = tz.region;
    if (!groups[region]) groups[region] = [];
    groups[region].push(tz);
  }
  return groups;
}

/**
 * Valide qu'une string est un IANA TZ correct.
 * Utilise Intl.DateTimeFormat (qui throw si TZ invalide).
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
