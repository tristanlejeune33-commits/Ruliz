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

export const SCHEDULE_PRESETS: Record<
  Exclude<ScheduleType, "always" | "custom">,
  { start: string; end: string; label: string; emoji: string }
> = {
  lunch: {
    start: "11:30",
    end: "15:00",
    label: "Carte du midi (11h30 - 15h00)",
    emoji: "☀️",
  },
  dinner: {
    start: "18:30",
    end: "23:00",
    label: "Carte du soir (18h30 - 23h00)",
    emoji: "🌙",
  },
  happy_hour: {
    start: "18:00",
    end: "19:00",
    label: "Happy Hour (18h00 - 19h00)",
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
 * @param now (optionnel) — Date à utiliser comme "maintenant", utile pour les tests
 */
export function isCategorieVisibleNow(
  categorie: CategorieSchedule,
  now: Date = new Date(),
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
  } else {
    const preset =
      SCHEDULE_PRESETS[
        categorie.scheduleType as keyof typeof SCHEDULE_PRESETS
      ];
    if (preset) {
      start = preset.start;
      end = preset.end;
    }
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
 * Liste des labels pour affichage UI.
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
    hint: "Visible uniquement entre 11h30 et 15h.",
  },
  {
    value: "dinner",
    label: "🌙 Carte du soir",
    hint: "Visible uniquement entre 18h30 et 23h.",
  },
  {
    value: "happy_hour",
    label: "🍹 Happy Hour",
    hint: "Visible uniquement entre 18h et 19h.",
  },
  {
    value: "custom",
    label: "🎯 Horaires personnalisés",
    hint: "Définis tes propres horaires + jours de la semaine.",
  },
];
