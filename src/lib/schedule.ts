/**
 * Helpers pour gérer les créneaux d'affichage des catégories
 * (carte midi, carte soir, happy hour, custom).
 *
 * Côté serveur ET client (pas de dépendance Node-only).
 * Le timezone est celui du serveur (Europe/Paris en pratique sur Railway EU West).
 */

export type ScheduleType =
  | "always" // Visible 24/7
  | "lunch" // 11:30 → 15:00
  | "dinner" // 18:30 → 23:00
  | "happy_hour" // 18:00 → 19:00
  | "custom"; // Horaires perso via scheduleStart/End

/**
 * Horaires par défaut si le resto ne les a pas customisés.
 * Le resto peut override ces valeurs via Restaurant.lunchStart/End, etc.
 */
export const DEFAULT_PRESET_HOURS: Record<
  Exclude<ScheduleType, "always" | "custom">,
  { start: string; end: string }
> = {
  lunch: { start: "11:30", end: "15:00" },
  dinner: { start: "18:30", end: "23:00" },
  happy_hour: { start: "18:00", end: "19:00" },
};

/**
 * Horaires des presets pour CE restaurant (mix défauts + overrides).
 * Si le resto a configuré ses propres horaires (ex: dîner 19h-23h30 au lieu
 * du défaut 18h30-23h), on les utilise.
 */
export interface RestaurantPresetHours {
  lunchStart?: string | null;
  lunchEnd?: string | null;
  dinnerStart?: string | null;
  dinnerEnd?: string | null;
  happyHourStart?: string | null;
  happyHourEnd?: string | null;
}

export function resolvePresetHours(
  preset: Exclude<ScheduleType, "always" | "custom">,
  resto?: RestaurantPresetHours,
): { start: string; end: string } {
  const defaults = DEFAULT_PRESET_HOURS[preset];
  if (!resto) return defaults;

  switch (preset) {
    case "lunch":
      return {
        start: resto.lunchStart || defaults.start,
        end: resto.lunchEnd || defaults.end,
      };
    case "dinner":
      return {
        start: resto.dinnerStart || defaults.start,
        end: resto.dinnerEnd || defaults.end,
      };
    case "happy_hour":
      return {
        start: resto.happyHourStart || defaults.start,
        end: resto.happyHourEnd || defaults.end,
      };
  }
}

export const SCHEDULE_PRESETS: Record<
  Exclude<ScheduleType, "always" | "custom">,
  { label: string; emoji: string }
> = {
  lunch: {
    label: "Carte du midi",
    emoji: "☀️",
  },
  dinner: {
    label: "Carte du soir",
    emoji: "🌙",
  },
  happy_hour: {
    label: "Happy Hour",
    emoji: "🍹",
  },
};

interface CategorieSchedule {
  scheduleType: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  scheduleDays: string;
}

/**
 * Retourne true si la catégorie doit être visible MAINTENANT.
 *
 * Règles :
 *  - "always" → toujours visible
 *  - autre → vérifie que :
 *    1. Le jour courant est dans scheduleDays (ISO weekday "1"-"7", Mon=1)
 *    2. L'heure courante est entre start et end (de la preset OU custom)
 *
 * @param categorie - Le créneau de la catégorie/produit
 * @param now (optionnel) · Date à utiliser comme "maintenant", utile pour les tests
 * @param restoHours (optionnel) · Horaires customisés du restaurant pour les presets
 */
export function isCategorieVisibleNow(
  categorie: CategorieSchedule,
  now: Date = new Date(),
  restoHours?: RestaurantPresetHours,
): boolean {
  if (categorie.scheduleType === "always") return true;

  // Jour de la semaine ISO : 1 (lundi) ... 7 (dimanche)
  // JS getDay() : 0 (dim) ... 6 (sam) → on remappe
  const jsDay = now.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  if (!categorie.scheduleDays.includes(String(isoDay))) return false;

  // Heures de début / fin
  let start: string | undefined;
  let end: string | undefined;

  if (categorie.scheduleType === "custom") {
    start = categorie.scheduleStart ?? undefined;
    end = categorie.scheduleEnd ?? undefined;
  } else if (
    categorie.scheduleType === "lunch" ||
    categorie.scheduleType === "dinner" ||
    categorie.scheduleType === "happy_hour"
  ) {
    // Utilise les horaires du resto si dispo, sinon les défauts
    const hours = resolvePresetHours(categorie.scheduleType, restoHours);
    start = hours.start;
    end = hours.end;
  }

  if (!start || !end) return true; // si schedule mal configuré, on affiche par défaut

  // Compare au format HH:MM (string compare est valide en lex order pour ce format)
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Si end < start, on suppose que le créneau passe minuit (ex: 22:00 → 02:00)
  if (end < start) {
    return currentTime >= start || currentTime <= end;
  }
  return currentTime >= start && currentTime <= end;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Liste des labels pour affichage UI. Les hints dynamiques (avec horaires du
 * resto) doivent être construits côté composant via `resolvePresetHours`.
 */
export const SCHEDULE_OPTIONS: Array<{
  value: ScheduleType;
  label: string;
  hint: string;
}> = [
  {
    value: "always",
    label: "Toujours visible",
    hint: "Affichée en permanence, peu importe l'heure.",
  },
  {
    value: "lunch",
    label: "☀️ Carte du midi",
    hint: "Visible pendant le service du midi (configurable dans Mon resto).",
  },
  {
    value: "dinner",
    label: "🌙 Carte du soir",
    hint: "Visible pendant le service du soir (configurable dans Mon resto).",
  },
  {
    value: "happy_hour",
    label: "🍹 Happy Hour",
    hint: "Visible pendant l'happy hour (configurable dans Mon resto).",
  },
  {
    value: "custom",
    label: "🎯 Horaires personnalisés",
    hint: "Définis tes propres horaires + jours de la semaine.",
  },
];
