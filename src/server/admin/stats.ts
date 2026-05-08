import "server-only";
import { prisma } from "@/lib/db";

const PLAN_PRICES = {
  freemium: 0,
  pro: 29.9,
  premium: 44.9,
} as const;

export async function getAdminKpis() {
  const [activeClients, allRestaurants, qrcodes, last30Scans] = await Promise.all([
    prisma.user.count({ where: { role: "client", statut: "actif" } }),
    prisma.restaurant.findMany({
      where: { statut: "actif" },
      select: { plan: true },
    }),
    prisma.qrcode.aggregate({
      _sum: { scanTotal: true },
    }),
    prisma.scan.count({
      where: {
        scannedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const mrr = allRestaurants.reduce((acc, r) => acc + PLAN_PRICES[r.plan], 0);

  return {
    activeClients,
    totalRestaurants: allRestaurants.length,
    mrr,
    scansAllTime: Number(qrcodes._sum.scanTotal ?? 0),
    scans30d: last30Scans,
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
