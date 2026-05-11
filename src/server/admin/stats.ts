import "server-only";
import { prisma } from "@/lib/db";

const PLAN_PRICES = {
  freemium: 0,
  pro: 29.9,
  premium: 44.9,
} as const;

export async function getAdminKpis() {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    activeClients,
    newClients7d,
    allRestaurants,
    qrcodes,
    scans24h,
    scans7d,
    scans30d,
    uniqueRestos24h,
    uniqueScans7dByUA,
    uniqueScans30dByUA,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "client", statut: "actif" } }),
    prisma.user.count({
      where: {
        role: "client",
        createdAt: { gte: since7d },
      },
    }),
    prisma.restaurant.findMany({
      where: { statut: "actif" },
      select: { plan: true },
    }),
    // Impressions cumulées = sum des compteurs scanTotal sur tous les QR codes
    prisma.qrcode.aggregate({
      _sum: { scanTotal: true },
    }),
    // Scans 24h / 7j / 30j depuis la table scans (events bruts)
    prisma.scan.count({ where: { scannedAt: { gte: since24h } } }),
    prisma.scan.count({ where: { scannedAt: { gte: since7d } } }),
    prisma.scan.count({ where: { scannedAt: { gte: since30d } } }),
    // Restaurants distincts ayant reçu au moins un scan aujourd'hui
    prisma.scan.groupBy({
      by: ["restaurantId"],
      where: {
        scannedAt: { gte: since24h },
        restaurantId: { not: null },
      },
    }),
    // Approximation "scans uniques" : groupBy userAgent (proxy faute d'ipHash en DB)
    prisma.scan.groupBy({
      by: ["userAgent"],
      where: { scannedAt: { gte: since7d } },
    }),
    prisma.scan.groupBy({
      by: ["userAgent"],
      where: { scannedAt: { gte: since30d } },
    }),
  ]);

  const mrr = allRestaurants.reduce((acc, r) => acc + PLAN_PRICES[r.plan], 0);

  return {
    activeClients,
    newClients7d,
    totalRestaurants: allRestaurants.length,
    mrr,
    // Impressions = total cumulé de tous les scans depuis le début
    impressions: Number(qrcodes._sum.scanTotal ?? 0),
    // Scans = events bruts (table scans) par période
    scans24h,
    scans7d,
    scans30d,
    // Restaurants ayant été scannés au moins 1× dans les dernières 24h
    activeRestos24h: uniqueRestos24h.length,
    // Approximation visiteurs uniques (distinct userAgent par période)
    uniqueVisitors7d: uniqueScans7dByUA.length,
    uniqueVisitors30d: uniqueScans30dByUA.length,
  };
}

/**
 * Time series : signups & restos créés par jour sur les 30 derniers jours.
 */
export async function getSignupTimeseries() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, restos] = await Promise.all([
    prisma.user.findMany({
      where: { role: "client", createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.restaurant.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const buckets = new Map<string, { date: string; signups: number; restos: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, signups: 0, restos: 0 });
  }

  for (const u of users) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (row) row.signups += 1;
  }
  for (const r of restos) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (row) row.restos += 1;
  }

  return [...buckets.values()];
}
