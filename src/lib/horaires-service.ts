/**
 * Horaires de service structurés — 7 jours × { closed, midi, soir }.
 *
 * Stocké dans `restaurants.horaires_service` (JSONB).
 * Lu par le site v2 (Practical.hours), et potentiellement par la carte
 * publique plus tard. Affiché côté UI par le picker /dashboard/restaurant.
 *
 * Format strict : array toujours de longueur 7, ordre lun→dim.
 */

export type DayCode = "lun" | "mar" | "mer" | "jeu" | "ven" | "sam" | "dim";

export const DAY_CODES: readonly DayCode[] = [
  "lun",
  "mar",
  "mer",
  "jeu",
  "ven",
  "sam",
  "dim",
] as const;

export const DAY_LABELS_FULL: Record<DayCode, string> = {
  lun: "Lundi",
  mar: "Mardi",
  mer: "Mercredi",
  jeu: "Jeudi",
  ven: "Vendredi",
  sam: "Samedi",
  dim: "Dimanche",
};

export const DAY_LABELS_SHORT: Record<DayCode, string> = {
  lun: "Lun",
  mar: "Mar",
  mer: "Mer",
  jeu: "Jeu",
  ven: "Ven",
  sam: "Sam",
  dim: "Dim",
};

/**
 * Plage horaire en HH:mm. Ex : { start: "12:00", end: "14:30" }.
 * `null` = service inactif ce jour-là.
 */
export interface ServiceRange {
  start: string;
  end: string;
}

/**
 * Une journée de service. `closed = true` masque les deux services.
 * Sinon, midi/soir peuvent être null indépendamment (ex: que dîner).
 *
 * `continu = true` → service continu (ex: 11h30→23h sans coupure). Dans ce
 * mode, la plage unique est stockée dans `midi` et `soir` reste null. Le champ
 * est purement UI : l'affichage (`formatDayService`) rend simplement la plage
 * `midi`, donc une donnée legacy sans `continu` reste correctement rendue.
 */
export interface DayService {
  day: DayCode;
  closed: boolean;
  /** Service du midi (déjeuner), OU la plage unique si `continu`. */
  midi: ServiceRange | null;
  /** Service du soir (dîner). null si pas de service soir ce jour. */
  soir: ServiceRange | null;
  /** Service continu : une seule plage (dans `midi`), pas de coupure. */
  continu?: boolean;
}

/** Toujours 7 entrées, ordre lun→dim. */
export type HorairesService = [
  DayService,
  DayService,
  DayService,
  DayService,
  DayService,
  DayService,
  DayService,
];

/**
 * Construit une valeur par défaut "tous les jours fermés".
 * Le restaurateur active les jours et saisit les heures.
 */
export function emptyHorairesService(): HorairesService {
  return DAY_CODES.map((day) => ({
    day,
    closed: true,
    midi: null,
    soir: null,
  })) as HorairesService;
}

/**
 * Preset standard bistrot français : mar-sam midi+soir, fermé dim-lun.
 * Utilisé par le bouton "Appliquer preset" du form.
 */
export function presetBistrot(): HorairesService {
  return DAY_CODES.map((day) => {
    if (day === "lun" || day === "dim") {
      return { day, closed: true, midi: null, soir: null };
    }
    return {
      day,
      closed: false,
      midi: { start: "12:00", end: "14:30" },
      soir: { start: "19:00", end: "22:30" },
    };
  }) as HorairesService;
}

/**
 * Preset 7j/7 service continu : pratique pour pizzerias / brasseries.
 */
export function presetSeptJoursSur7(): HorairesService {
  return DAY_CODES.map((day) => ({
    day,
    closed: false,
    midi: { start: "12:00", end: "14:30" },
    soir: { start: "19:00", end: "23:00" },
  })) as HorairesService;
}

/**
 * Preset soir uniquement (mar-sam, fermé dim-lun) — pour omakase / gastro.
 */
export function presetSoirUniquement(): HorairesService {
  return DAY_CODES.map((day) => {
    if (day === "lun" || day === "dim") {
      return { day, closed: true, midi: null, soir: null };
    }
    return {
      day,
      closed: false,
      midi: null,
      soir: { start: "19:30", end: "22:30" },
    };
  }) as HorairesService;
}

/**
 * Formate une heure HH:mm → "12h" si :00, "14h30" sinon.
 * Convention française commune pour les cartes de restaurants.
 */
export function formatHourMinute(hm: string): string {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm)) return hm;
  const [h, m] = hm.split(":");
  return m === "00" ? `${h}h` : `${h}h${m}`;
}

/**
 * Convertit une DayService en string affichable.
 *  - closed → null (interprété comme "Fermé" côté UI)
 *  - midi seul → "12h–14h30"
 *  - soir seul → "19h–22h30"
 *  - les deux → "12h–14h30 · 19h–22h30"
 */
export function formatDayService(d: DayService): string | null {
  if (d.closed) return null;
  const parts: string[] = [];
  if (d.midi && d.midi.start && d.midi.end) {
    parts.push(`${formatHourMinute(d.midi.start)}–${formatHourMinute(d.midi.end)}`);
  }
  if (d.soir && d.soir.start && d.soir.end) {
    parts.push(`${formatHourMinute(d.soir.start)}–${formatHourMinute(d.soir.end)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Type guard : vérifie qu'une valeur unknown ressemble à un HorairesService
 * valide. Utilisé par le loader Prisma pour parser le JSONB.
 */
export function isHorairesService(v: unknown): v is HorairesService {
  if (!Array.isArray(v) || v.length !== 7) return false;
  for (let i = 0; i < 7; i++) {
    const d = v[i];
    if (!d || typeof d !== "object") return false;
    const day = (d as Record<string, unknown>).day;
    if (day !== DAY_CODES[i]) return false;
  }
  return true;
}

/**
 * Format string complet pour le site v2 : array de { day, hours } compatible
 * avec le type `HoursRow` du template.
 */
export interface HoursRowOutput {
  day: DayCode;
  /** null = fermé (rendu "Fermé" en italique côté site) */
  hours: string | null;
}

export function horairesServiceToHoursRows(
  h: HorairesService | null,
): HoursRowOutput[] {
  if (!h) {
    return DAY_CODES.map((day) => ({ day, hours: "—" }));
  }
  return h.map((d) => ({
    day: d.day,
    hours: formatDayService(d),
  }));
}
