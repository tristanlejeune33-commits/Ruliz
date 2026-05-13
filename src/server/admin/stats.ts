import "server-only";
import { prisma } from "@/lib/db";

const PLAN_PRICES = {
  freemium: 0,
  pro: 29.9,
  premium: 44.9,
} as const;

/**
 * Filtre standard pour exclure les comptes admin des KPIs : leur restaurant
 * "démo" sert juste à préparer les démos prospects, il ne reflète pas un
 * vrai client payant et ne doit pas peser dans MRR / scans / etc.
 */
const NON_ADMIN_USER_FILTER = {
  user: { role: { not: "admin" as const } },
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
    // Exclu les restaurants démo des admins → MRR & totalRestaurants ne
    // gonflent pas artificiellement.
    prisma.restaurant.findMany({
      where: { statut: "actif", ...NON_ADMIN_USER_FILTER },
      select: { plan: true },
    }),
    // Impressions cumulées — exclut les scans des cartes démo admin.
    prisma.qrcode.aggregate({
      _sum: { scanTotal: true },
      where: { restaurant: NON_ADMIN_USER_FILTER },
    }),
    // Scans 24h / 7j / 30j depuis la table scans (events bruts)
    prisma.scan.count({
      where: {
        scannedAt: { gte: since24h },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
    prisma.scan.count({
      where: {
        scannedAt: { gte: since7d },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
    prisma.scan.count({
      where: {
        scannedAt: { gte: since30d },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
    // Restaurants distincts ayant reçu au moins un scan aujourd'hui
    prisma.scan.groupBy({
      by: ["restaurantId"],
      where: {
        scannedAt: { gte: since24h },
        restaurantId: { not: null },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
    // Approximation "scans uniques" : groupBy userAgent (proxy faute d'ipHash en DB)
    prisma.scan.groupBy({
      by: ["userAgent"],
      where: {
        scannedAt: { gte: since7d },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
    prisma.scan.groupBy({
      by: ["userAgent"],
      where: {
        scannedAt: { gte: since30d },
        restaurant: NON_ADMIN_USER_FILTER,
      },
    }),
  ]);

  const mrr = allRestaurants.reduce((acc, r) => acc + PLAN_PRICES[r.plan], 0);

  // Revenus boutique cumulés (commandes payées) — exclu les commandes
  // des comptes admin (achats internes / tests).
  const boutiqueRev = (await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(total_centimes), 0)::int AS "totalCentimes"
     FROM boutique_commandes
     WHERE paid_at IS NOT NULL
       AND user_id NOT IN (SELECT id FROM users WHERE role = 'admin')`,
  ).catch(() => [{ totalCentimes: 0 }])) as Array<{ totalCentimes: number }>;
  // Revenus SMS cumulés (packs achetés) — exclu aussi les restaurants
  // appartenant à un admin (pas de user_id direct sur sms_credit_purchases,
  // on passe par restaurant_id → restaurants → user_id).
  const smsRev = (await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(price_paid_centimes), 0)::int AS "totalCentimes"
     FROM sms_credit_purchases
     WHERE status = 'paid'
       AND restaurant_id NOT IN (
         SELECT id FROM restaurants
         WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
       )`,
  ).catch(() => [{ totalCentimes: 0 }])) as Array<{ totalCentimes: number }>;

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
    // Revenus cumulés (centimes)
    revenueBoutiqueCentimes: boutiqueRev[0]?.totalCentimes ?? 0,
    revenueSmsCentimes: smsRev[0]?.totalCentimes ?? 0,
  };
}

// ============================================================
// TIMESERIES 3 ANS — pour les modals "graphique temporel"
// ============================================================

export type TimeseriesKpi =
  | "signups"
  | "scans"
  | "revenueBoutique"
  | "revenueSms"
  | "mrr"
  | "uniqueVisitors"
  | "restaurants"
  | "activeRestos"
  | "impressions";

/**
 * Retourne une série temporelle sur N jours (max 1100 = 3 ans) pour un KPI
 * donné. Granularité auto :
 *   - ≤ 60 jours → quotidien
 *   - ≤ 365 jours → hebdomadaire
 *   - > 365 jours → mensuel
 *
 * Utilisé par les modals KPI cliquables.
 */
export async function getKpiTimeseries(
  kpi: TimeseriesKpi,
  days: number = 1100, // ~3 ans
): Promise<Array<{ date: string; value: number }>> {
  const safeDays = Math.max(1, Math.min(1100, days));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  // Granularité : 'day' / 'week' / 'month'
  const grain = safeDays <= 60 ? "day" : safeDays <= 365 ? "week" : "month";

  try {
    let rows: Array<{ bucket: Date; value: number }> = [];

    // CTE constante : IDs des users admin → on s'en sert dans tous les
    // WHERE/JOIN pour exclure leur restaurant démo des KPIs.
    const adminExcl =
      "user_id NOT IN (SELECT id FROM users WHERE role = 'admin')";

    if (kpi === "signups") {
      // Déjà filtré sur role='client', donc admin déjà exclu.
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, created_at) AS "bucket", COUNT(*)::int AS "value"
         FROM users
         WHERE role = 'client' AND created_at >= $1
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "scans") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, scanned_at) AS "bucket", COUNT(*)::int AS "value"
         FROM scans s
         WHERE s.scanned_at >= $1
           AND (s.restaurant_id IS NULL OR s.restaurant_id NOT IN (
             SELECT id FROM restaurants WHERE ${adminExcl}
           ))
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "uniqueVisitors") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, scanned_at) AS "bucket",
                COUNT(DISTINCT COALESCE(user_agent, '') || '|' || COALESCE(pays, ''))::int AS "value"
         FROM scans s
         WHERE s.scanned_at >= $1
           AND (s.restaurant_id IS NULL OR s.restaurant_id NOT IN (
             SELECT id FROM restaurants WHERE ${adminExcl}
           ))
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "revenueBoutique") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, paid_at) AS "bucket",
                COALESCE(SUM(total_centimes), 0)::int AS "value"
         FROM boutique_commandes
         WHERE paid_at >= $1
           AND ${adminExcl}
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "revenueSms") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, paid_at) AS "bucket",
                COALESCE(SUM(price_paid_centimes), 0)::int AS "value"
         FROM sms_credit_purchases
         WHERE status = 'paid' AND paid_at >= $1
           AND restaurant_id NOT IN (
             SELECT id FROM restaurants WHERE ${adminExcl}
           )
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "restaurants") {
      // Restaurants créés par bucket — exclu les démos admin.
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, created_at) AS "bucket", COUNT(*)::int AS "value"
         FROM restaurants
         WHERE created_at >= $1
           AND ${adminExcl}
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "activeRestos") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, scanned_at) AS "bucket",
                COUNT(DISTINCT restaurant_id)::int AS "value"
         FROM scans s
         WHERE s.scanned_at >= $1 AND s.restaurant_id IS NOT NULL
           AND s.restaurant_id NOT IN (
             SELECT id FROM restaurants WHERE ${adminExcl}
           )
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "impressions") {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT date_trunc($2, scanned_at) AS "bucket", COUNT(*)::int AS "value"
         FROM scans s
         WHERE s.scanned_at >= $1
           AND (s.restaurant_id IS NULL OR s.restaurant_id NOT IN (
             SELECT id FROM restaurants WHERE ${adminExcl}
           ))
         GROUP BY 1 ORDER BY 1`,
        since,
        grain,
      )) as typeof rows;
    } else if (kpi === "mrr") {
      // MRR mensuel : sum des prix des plans actifs par mois — exclu les
      // restaurants démo des admins.
      rows = (await prisma.$queryRawUnsafe(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', $1::timestamptz),
             date_trunc('month', NOW()),
             '1 month'::interval
           ) AS bucket
         )
         SELECT m.bucket,
                SUM(CASE r.plan
                  WHEN 'pro' THEN 2990
                  WHEN 'premium' THEN 4490
                  ELSE 0
                END)::int AS "value"
         FROM months m
         LEFT JOIN restaurants r ON r.created_at <= m.bucket + interval '1 month' - interval '1 second'
           AND r.statut = 'actif'
           AND r.${adminExcl}
         GROUP BY m.bucket
         ORDER BY m.bucket`,
        since,
      )) as typeof rows;
    }

    return rows.map((r) => ({
      date: r.bucket.toISOString().slice(0, 10),
      value: Number(r.value),
    }));
  } catch (err) {
    console.warn("[admin] getKpiTimeseries failed:", err);
    return [];
  }
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
    // Exclu les restos démo des admins.
    prisma.restaurant.findMany({
      where: { createdAt: { gte: since }, ...NON_ADMIN_USER_FILTER },
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
