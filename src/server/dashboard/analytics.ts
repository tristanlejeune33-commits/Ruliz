import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  BROWSER_LABEL,
  DEVICE_LABEL,
  OS_LABEL,
  parseUserAgent,
  type Browser,
  type Device,
  type OS,
} from "@/lib/user-agent";
import { countryMeta } from "@/lib/countries";

// ---------------- Types & helpers ----------------

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "365d" | "custom";

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  customStart?: string; // YYYY-MM-DD
  customEnd?: string;
  device?: Device | "all";
  os?: OS | "all";
  country?: string; // ISO-2 or "all"
  lang?: string; // 2-letter or "all"
}

export interface DateRange {
  start: Date;
  end: Date;
  /** Same length window before `start`. */
  prevStart: Date;
  prevEnd: Date;
  /** Number of days. */
  days: number;
}

const PERIOD_DAYS: Record<Exclude<AnalyticsPeriod, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

export function resolveRange(filters: AnalyticsFilters): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  let start: Date;

  if (filters.period === "custom" && filters.customStart && filters.customEnd) {
    start = new Date(filters.customStart);
    const customEnd = new Date(filters.customEnd);
    customEnd.setHours(23, 59, 59, 999);
    return {
      start,
      end: customEnd,
      prevStart: new Date(start.getTime() - (customEnd.getTime() - start.getTime())),
      prevEnd: new Date(start.getTime() - 1),
      days: Math.max(
        1,
        Math.ceil((customEnd.getTime() - start.getTime()) / (24 * 3600 * 1000)),
      ),
    };
  }

  const days = PERIOD_DAYS[filters.period as Exclude<AnalyticsPeriod, "custom">] ?? 30;
  start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  return { start, end, prevStart, prevEnd, days };
}

function evolutionPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** UA fingerprint approximé (UA + pays) · pas de tracking persistant. */
function fingerprint(ua: string | null, pays: string | null): string {
  return createHash("md5")
    .update(`${ua ?? ""}|${pays ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

// ---------------- Main query ----------------

export interface AnalyticsResult {
  range: { start: string; end: string; days: number };
  kpis: {
    totalScans: number;
    totalScansEvol: number | null;
    uniqueScans: number; // approx via UA+pays fingerprint
    uniqueScansEvol: number | null;
    dau: number; // approx · uniques on the last day
    wau: number; // last 7 days
    mau: number; // last 30 days
    newUsers: number; // fingerprints unseen in the previous range
    returningUsers: number;
    avgScansPerUser: number;
    busiestHour: number; // 0-23
    busiestDayOfWeek: number; // 0=Sun ... 6=Sat
  };
  perDay: Array<{ date: string; scans: number; previous: number }>;
  perHourDay: Array<{ day: number; hour: number; count: number }>; // 7×24 buckets
  devices: Array<{ key: Device; label: string; count: number }>;
  browsers: Array<{ key: Browser; label: string; count: number }>;
  oses: Array<{ key: OS; label: string; count: number }>;
  countries: Array<{ code: string; name: string; flag: string; count: number }>;
  langs: Array<{ lang: string; count: number }>;
  topQrcodes: Array<{ id: string; codeUnique: string; count: number }>;
  liveFeed: Array<{
    id: string;
    scannedAt: string;
    lang: string | null;
    pays: string | null;
    device: Device;
    browser: Browser;
    qrcodeCode: string | null;
  }>;
  insights: string[];
}

interface ScanRow {
  id: bigint;
  qrcodeId: bigint | null;
  lang: string | null;
  userAgent: string | null;
  pays: string | null;
  scannedAt: Date;
}

export async function getAnalytics(
  restaurantId: bigint,
  filters: AnalyticsFilters,
): Promise<AnalyticsResult> {
  const range = resolveRange(filters);

  // Pull all relevant scans from the current + previous window.
  // For 50 restos × 100k scans/day this fits fine ; if it grows we'll move
  // some aggregations into raw SQL.
  const [currentScans, previousScans, qrcodes] = await Promise.all([
    prisma.scan.findMany({
      where: {
        restaurantId,
        scannedAt: { gte: range.start, lte: range.end },
      },
      select: {
        id: true,
        qrcodeId: true,
        lang: true,
        userAgent: true,
        pays: true,
        scannedAt: true,
      },
      orderBy: { scannedAt: "desc" },
    }),
    prisma.scan.findMany({
      where: {
        restaurantId,
        scannedAt: { gte: range.prevStart, lte: range.prevEnd },
      },
      select: {
        userAgent: true,
        pays: true,
        scannedAt: true,
      },
    }),
    prisma.qrcode.findMany({
      where: { restaurantId },
      select: { id: true, codeUnique: true },
    }),
  ]);

  const qrCodeMap = new Map(
    qrcodes.map((q) => [q.id.toString(), q.codeUnique]),
  );

  // Apply filters in JS (already restaurant-scoped at SQL level)
  const filtered = currentScans.filter((s) => applyFilters(s, filters));

  // ---------- KPIs ----------
  const totalScans = filtered.length;
  const totalScansPrev = previousScans.length;

  const fingerprintsCurrent = new Set(
    filtered.map((s) => fingerprint(s.userAgent, s.pays)),
  );
  const fingerprintsPrevious = new Set(
    previousScans.map((s) => fingerprint(s.userAgent, s.pays)),
  );
  const uniqueScans = fingerprintsCurrent.size;
  const uniqueScansPrev = fingerprintsPrevious.size;

  const newUsers = [...fingerprintsCurrent].filter(
    (f) => !fingerprintsPrevious.has(f),
  ).length;
  const returningUsers = uniqueScans - newUsers;

  const lastDayStart = new Date();
  lastDayStart.setHours(0, 0, 0, 0);
  const dau = new Set(
    filtered
      .filter((s) => s.scannedAt >= lastDayStart)
      .map((s) => fingerprint(s.userAgent, s.pays)),
  ).size;

  const last7Start = new Date();
  last7Start.setDate(last7Start.getDate() - 6);
  last7Start.setHours(0, 0, 0, 0);
  const wau = new Set(
    filtered
      .filter((s) => s.scannedAt >= last7Start)
      .map((s) => fingerprint(s.userAgent, s.pays)),
  ).size;

  const last30Start = new Date();
  last30Start.setDate(last30Start.getDate() - 29);
  last30Start.setHours(0, 0, 0, 0);
  const mau = new Set(
    filtered
      .filter((s) => s.scannedAt >= last30Start)
      .map((s) => fingerprint(s.userAgent, s.pays)),
  ).size;

  const avgScansPerUser =
    uniqueScans > 0 ? Math.round((totalScans / uniqueScans) * 10) / 10 : 0;

  // ---------- Time series ----------
  const perDayMap = new Map<string, { date: string; scans: number; previous: number }>();
  for (let i = range.days - 1; i >= 0; i--) {
    const d = new Date(range.end);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    perDayMap.set(key, { date: key, scans: 0, previous: 0 });
  }
  for (const s of filtered) {
    const k = s.scannedAt.toISOString().slice(0, 10);
    const row = perDayMap.get(k);
    if (row) row.scans += 1;
  }

  // Map previous scans by their offset from prevStart, then back into the
  // current window by adding `range.days` days.
  for (const s of previousScans) {
    const offsetDays = Math.floor(
      (s.scannedAt!.getTime() - range.prevStart.getTime()) / (24 * 3600 * 1000),
    );
    const projected = new Date(range.start);
    projected.setDate(projected.getDate() + offsetDays);
    const k = projected.toISOString().slice(0, 10);
    const row = perDayMap.get(k);
    if (row) row.previous += 1;
  }

  // ---------- Heatmap ----------
  const perHourDay: Array<{ day: number; hour: number; count: number }> = [];
  const heatmapBuckets = new Map<string, number>();
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapBuckets.set(`${d}-${h}`, 0);
    }
  }
  for (const s of filtered) {
    const day = s.scannedAt.getDay();
    const hour = s.scannedAt.getHours();
    const k = `${day}-${hour}`;
    heatmapBuckets.set(k, (heatmapBuckets.get(k) ?? 0) + 1);
  }
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      perHourDay.push({ day: d, hour: h, count: heatmapBuckets.get(`${d}-${h}`) ?? 0 });
    }
  }

  // ---------- Breakdowns ----------
  const deviceCounts = new Map<Device, number>();
  const browserCounts = new Map<Browser, number>();
  const osCounts = new Map<OS, number>();
  const countryCounts = new Map<string, number>();
  const langCounts = new Map<string, number>();
  const qrcodeCounts = new Map<string, number>();
  const hourCounts = new Array(24).fill(0) as number[];
  const dowCounts = new Array(7).fill(0) as number[];

  for (const s of filtered) {
    const ua = parseUserAgent(s.userAgent);
    deviceCounts.set(ua.device, (deviceCounts.get(ua.device) ?? 0) + 1);
    browserCounts.set(ua.browser, (browserCounts.get(ua.browser) ?? 0) + 1);
    osCounts.set(ua.os, (osCounts.get(ua.os) ?? 0) + 1);

    const c = (s.pays ?? "??").toUpperCase();
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);

    const l = s.lang ?? "??";
    langCounts.set(l, (langCounts.get(l) ?? 0) + 1);

    if (s.qrcodeId) {
      const k = s.qrcodeId.toString();
      qrcodeCounts.set(k, (qrcodeCounts.get(k) ?? 0) + 1);
    }
    hourCounts[s.scannedAt.getHours()]! += 1;
    dowCounts[s.scannedAt.getDay()]! += 1;
  }

  const devices = [...deviceCounts.entries()]
    .map(([key, count]) => ({ key, label: DEVICE_LABEL[key], count }))
    .sort((a, b) => b.count - a.count);
  const browsers = [...browserCounts.entries()]
    .map(([key, count]) => ({ key, label: BROWSER_LABEL[key], count }))
    .sort((a, b) => b.count - a.count);
  const oses = [...osCounts.entries()]
    .map(([key, count]) => ({ key, label: OS_LABEL[key], count }))
    .sort((a, b) => b.count - a.count);
  const countries = [...countryCounts.entries()]
    .map(([code, count]) => {
      const meta = countryMeta(code);
      return { code, name: meta.name, flag: meta.flag, count };
    })
    .sort((a, b) => b.count - a.count);
  const langs = [...langCounts.entries()]
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count);
  const topQrcodes = [...qrcodeCounts.entries()]
    .map(([id, count]) => ({
      id,
      codeUnique: qrCodeMap.get(id) ?? "·",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));
  const busiestDayOfWeek = dowCounts.indexOf(Math.max(...dowCounts));

  // ---------- Live feed (50 most recent) ----------
  const liveFeed = filtered.slice(0, 50).map((s) => {
    const ua = parseUserAgent(s.userAgent);
    return {
      id: s.id.toString(),
      scannedAt: s.scannedAt.toISOString(),
      lang: s.lang,
      pays: s.pays,
      device: ua.device,
      browser: ua.browser,
      qrcodeCode: s.qrcodeId ? qrCodeMap.get(s.qrcodeId.toString()) ?? null : null,
    };
  });

  // ---------- Insights (rules-based) ----------
  const insights = computeInsights({
    totalScans,
    totalScansPrev,
    busiestHour,
    busiestDayOfWeek,
    countries,
    devices,
    perDay: [...perDayMap.values()],
    days: range.days,
  });

  return {
    range: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
    },
    kpis: {
      totalScans,
      totalScansEvol: evolutionPct(totalScans, totalScansPrev),
      uniqueScans,
      uniqueScansEvol: evolutionPct(uniqueScans, uniqueScansPrev),
      dau,
      wau,
      mau,
      newUsers,
      returningUsers,
      avgScansPerUser,
      busiestHour,
      busiestDayOfWeek,
    },
    perDay: [...perDayMap.values()],
    perHourDay,
    devices,
    browsers,
    oses,
    countries,
    langs,
    topQrcodes,
    liveFeed,
    insights,
  };
}

// ---------------- Filters (applied in JS) ----------------

function applyFilters(scan: ScanRow, filters: AnalyticsFilters): boolean {
  if (filters.country && filters.country !== "all") {
    if ((scan.pays ?? "").toUpperCase() !== filters.country.toUpperCase()) return false;
  }
  if (filters.lang && filters.lang !== "all") {
    if (scan.lang !== filters.lang) return false;
  }
  if (filters.device && filters.device !== "all") {
    const ua = parseUserAgent(scan.userAgent);
    if (ua.device !== filters.device) return false;
  }
  if (filters.os && filters.os !== "all") {
    const ua = parseUserAgent(scan.userAgent);
    if (ua.os !== filters.os) return false;
  }
  return true;
}

// ---------------- Insights generator ----------------

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function computeInsights(input: {
  totalScans: number;
  totalScansPrev: number;
  busiestHour: number;
  busiestDayOfWeek: number;
  countries: Array<{ code: string; name: string; count: number }>;
  devices: Array<{ key: Device; label: string; count: number }>;
  perDay: Array<{ date: string; scans: number; previous: number }>;
  days: number;
}): string[] {
  const out: string[] = [];

  if (input.totalScans === 0) {
    out.push(
      "Aucun scan sur la période. Vérifie que tes QR codes sont bien actifs et imprimés.",
    );
    return out;
  }

  // Évolution
  if (input.totalScansPrev > 0) {
    const diff = input.totalScans - input.totalScansPrev;
    const pct = Math.round((diff / input.totalScansPrev) * 100);
    if (pct >= 20) {
      out.push(`📈 Tes scans ont bondi de +${pct}% par rapport à la période précédente. Continue ce que tu fais !`);
    } else if (pct <= -20) {
      out.push(`📉 Tes scans ont chuté de ${pct}% vs la période précédente. Vérifie l'état de tes QR codes ou relance ton équipe sur la table.`);
    } else if (pct >= 5) {
      out.push(`📈 Légère hausse de +${pct}% vs la période précédente.`);
    } else if (pct <= -5) {
      out.push(`📉 Légère baisse de ${pct}% vs la période précédente.`);
    } else {
      out.push(`Tes scans sont stables (${pct >= 0 ? "+" : ""}${pct}%) vs la période précédente.`);
    }
  }

  // Heure de pointe
  if (input.busiestHour >= 0) {
    const hourLabel = `${String(input.busiestHour).padStart(2, "0")}h`;
    if (input.busiestHour >= 12 && input.busiestHour <= 14) {
      out.push(`🍽️ Pic à ${hourLabel} · service du midi. Assure-toi que la carte est à jour pour ce créneau.`);
    } else if (input.busiestHour >= 19 && input.busiestHour <= 21) {
      out.push(`🍷 Pic à ${hourLabel} · service du soir. Pousse les suggestions vins / desserts à ce moment-là.`);
    } else {
      out.push(`⏰ Pic d'activité à ${hourLabel}. Pense à programmer tes pop-ups événements autour de ce créneau.`);
    }
  }

  // Jour de pointe
  if (input.busiestDayOfWeek >= 0) {
    out.push(`📅 Ton meilleur jour est ${DAY_NAMES[input.busiestDayOfWeek]}.`);
  }

  // Top pays
  const topForeign = input.countries.find((c) => c.code !== "FR" && c.code !== "??");
  if (topForeign && topForeign.count >= 5) {
    out.push(`🌍 ${topForeign.count} scans depuis ${topForeign.name} · pense à vérifier la qualité de ta traduction.`);
  }

  // Mobile-first ?
  const mobileShare =
    input.devices.find((d) => d.key === "mobile")?.count ?? 0;
  const totalDevices = input.devices.reduce((acc, d) => acc + d.count, 0);
  if (totalDevices > 0) {
    const pct = Math.round((mobileShare / totalDevices) * 100);
    if (pct >= 90) {
      out.push(`📱 ${pct}% de tes scans viennent de mobiles. Ta carte est bien optimisée pour ce format.`);
    } else if (pct < 70) {
      out.push(`💻 ${100 - pct}% de tes consultations sont sur autre chose qu'un mobile. Inhabituel pour un menu de restaurant · vérifie tes flux d'acquisition.`);
    }
  }

  // Détection de pic anormal sur les 7 derniers jours vs moyenne
  if (input.perDay.length >= 14) {
    const recent7 = input.perDay.slice(-7).reduce((a, b) => a + b.scans, 0) / 7;
    const previous7 =
      input.perDay.slice(-14, -7).reduce((a, b) => a + b.scans, 0) / 7;
    if (recent7 > previous7 * 1.5 && recent7 - previous7 > 5) {
      out.push(`🔥 Pic d'activité inhabituel sur les 7 derniers jours (×${(recent7 / Math.max(previous7, 1)).toFixed(1)} vs la semaine d'avant).`);
    }
  }

  return out;
}
