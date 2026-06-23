/**
 * Détection de chevauchement entre deux pop-ups.
 *
 * Un pop-up est actif sur 3 dimensions simultanées :
 *   1. une plage de DATES   (dateDebut → dateFin, null = borne ouverte)
 *   2. des JOURS de semaine  (bitmap joursActifs, null/0 = tous les jours)
 *   3. une plage HORAIRE     (heureDebut → heureFin "HH:MM", null = toute la journée)
 *
 * Deux pop-ups se chevauchent s'ils peuvent être actifs AU MÊME MOMENT, donc si
 * les 3 dimensions se recoupent. La carte publique n'affiche qu'un pop-up à la
 * fois : un chevauchement = ambigu, on alerte le restaurateur.
 *
 * Module pur (pas de `server-only`) → utilisable côté client ET serveur.
 */

export interface PopupSchedule {
  /** ISO date/datetime ou "YYYY-MM-DD" ou null (borne ouverte). */
  dateDebut: string | null;
  dateFin: string | null;
  /** Bitmap 7 bits (bit 0 = dim … bit 6 = sam). null/0 = tous les jours. */
  joursActifs: number | null;
  /** "HH:MM" ou null (toute la journée). */
  heureDebut: string | null;
  heureFin: string | null;
}

const ALL_DAYS = 127; // 7 bits à 1

function startMs(d: string | null): number {
  if (!d) return Number.NEGATIVE_INFINITY;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function endMs(d: string | null): number {
  if (!d) return Number.POSITIVE_INFINITY;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  // Date sans heure → on couvre toute la journée (fin = +24h - 1ms).
  return t + 24 * 60 * 60 * 1000 - 1;
}

function timeToMin(t: string | null, fallback: number): number {
  if (!t) return fallback;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return fallback;
  return h * 60 + min;
}

/** Vrai si les deux pop-ups peuvent être actifs au même moment. */
export function popupsConflict(a: PopupSchedule, b: PopupSchedule): boolean {
  // 1) Dates
  if (startMs(a.dateDebut) > endMs(b.dateFin)) return false;
  if (startMs(b.dateDebut) > endMs(a.dateFin)) return false;

  // 2) Jours de semaine
  const aDays = a.joursActifs && a.joursActifs > 0 ? a.joursActifs : ALL_DAYS;
  const bDays = b.joursActifs && b.joursActifs > 0 ? b.joursActifs : ALL_DAYS;
  if ((aDays & bDays) === 0) return false;

  // 3) Plage horaire
  const aStart = timeToMin(a.heureDebut, 0);
  const aEnd = timeToMin(a.heureFin, 24 * 60);
  const bStart = timeToMin(b.heureDebut, 0);
  const bEnd = timeToMin(b.heureFin, 24 * 60);
  if (aStart >= bEnd || bStart >= aEnd) return false;

  return true;
}
