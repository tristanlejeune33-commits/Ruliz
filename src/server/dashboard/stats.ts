import "server-only";
import { prisma } from "@/lib/db";
import { getLocalTimeInTimezone } from "@/lib/schedule";

export type StatsPeriod = "7d" | "30d" | "90d";

const PERIOD_DAYS: Record<StatsPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function startOfPeriod(period: StatsPeriod) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (PERIOD_DAYS[period] - 1));
  return d;
}

export async function getRestaurantStats(restaurantId: bigint, period: StatsPeriod = "30d") {
  const since = startOfPeriod(period);
  const previousSince = new Date(since);
  previousSince.setDate(previousSince.getDate() - PERIOD_DAYS[period]);

  // Récup TZ resto via raw query (le client Prisma local peut ne pas avoir
  // re-généré la colonne, mais elle existe en DB via ensureRuntimeSchema).
  let restoTz = "Europe/Paris";
  try {
    const rows = await prisma.$queryRaw<Array<{ timezone: string | null }>>`
      SELECT timezone FROM restaurants WHERE id = ${restaurantId} LIMIT 1
    `;
    restoTz = rows[0]?.timezone || "Europe/Paris";
  } catch {
    // Fallback déjà à Europe/Paris
  }

  const [scansThis, scansPrev, scansPerDay, scansPerLang] = await Promise.all([
    prisma.scan.count({
      where: { restaurantId, scannedAt: { gte: since } },
    }),
    prisma.scan.count({
      where: {
        restaurantId,
        scannedAt: { gte: previousSince, lt: since },
      },
    }),
    prisma.scan.findMany({
      where: { restaurantId, scannedAt: { gte: since } },
      select: { scannedAt: true },
    }),
    prisma.scan.groupBy({
      by: ["lang"],
      where: { restaurantId, scannedAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  // Bucketize scansPerDay
  const buckets = new Map<string, { date: string; scans: number }>();
  for (let i = PERIOD_DAYS[period] - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), {
      date: d.toISOString().slice(0, 10),
      scans: 0,
    });
  }
  for (const s of scansPerDay) {
    const k = s.scannedAt.toISOString().slice(0, 10);
    const row = buckets.get(k);
    if (row) row.scans += 1;
  }

  // Bucketize per hour (0-23) DANS le TZ du resto (pas le TZ serveur UTC).
  // Sinon un coup de feu midi à Auckland (UTC+12/13) finit dans la barre
  // "23h" côté Railway — incompréhensible pour le restaurateur.
  const hourBuckets = new Map<number, { hour: number; scans: number }>();
  for (let h = 0; h < 24; h++) hourBuckets.set(h, { hour: h, scans: 0 });
  for (const s of scansPerDay) {
    const { hour } = getLocalTimeInTimezone(s.scannedAt, restoTz);
    const row = hourBuckets.get(hour);
    if (row) row.scans += 1;
  }

  const langBreakdown = scansPerLang.map((g) => ({
    lang: g.lang ?? "?",
    count: g._count._all,
  }));

  const evolutionPct =
    scansPrev > 0 ? Math.round(((scansThis - scansPrev) / scansPrev) * 100) : null;

  return {
    period,
    scansThis,
    scansPrev,
    evolutionPct,
    perDay: [...buckets.values()],
    perHour: [...hourBuckets.values()],
    langBreakdown,
  };
}
