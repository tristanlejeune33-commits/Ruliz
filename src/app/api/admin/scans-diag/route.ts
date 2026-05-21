import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers as nextHeaders } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Diagnostic admin — `/api/admin/scans-diag`
 *
 * Renvoie une analyse des scans des dernières 24h pour identifier d'où
 * viennent les volumes parasites :
 *   - Top 30 User-Agents avec leur compte
 *   - Top 10 restaurants ciblés
 *   - Histogramme horaire (24 buckets)
 *
 * Auth : admin requis. Pas d'auth → 401.
 */
export async function GET() {
  // Auth check
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Window : last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Top User-Agents (raw count)
  const topUas = await prisma.$queryRaw<
    Array<{ user_agent: string | null; count: bigint }>
  >`
    SELECT user_agent, COUNT(*)::bigint AS count
    FROM scans
    WHERE scanned_at >= ${since}
    GROUP BY user_agent
    ORDER BY count DESC
    LIMIT 30
  `;

  // Top resto ciblés
  const topRestos = await prisma.$queryRaw<
    Array<{ restaurant_id: bigint; count: bigint; nom: string }>
  >`
    SELECT s.restaurant_id, COUNT(*)::bigint AS count, r.nom
    FROM scans s
    LEFT JOIN restaurants r ON r.id = s.restaurant_id
    WHERE s.scanned_at >= ${since}
    GROUP BY s.restaurant_id, r.nom
    ORDER BY count DESC
    LIMIT 10
  `;

  // Histogramme par heure
  const hourly = await prisma.$queryRaw<
    Array<{ hour: Date; count: bigint }>
  >`
    SELECT date_trunc('hour', scanned_at) AS hour, COUNT(*)::bigint AS count
    FROM scans
    WHERE scanned_at >= ${since}
    GROUP BY hour
    ORDER BY hour DESC
  `;

  // Total
  const totalRow = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM scans WHERE scanned_at >= ${since}
  `;
  const total = Number(totalRow[0]?.count ?? 0n);

  return NextResponse.json({
    windowStart: since.toISOString(),
    total,
    topUserAgents: topUas.map((r) => ({
      userAgent: r.user_agent ?? "(null)",
      count: Number(r.count),
    })),
    topRestaurants: topRestos.map((r) => ({
      id: r.restaurant_id?.toString() ?? "(null)",
      nom: r.nom ?? "(unknown)",
      count: Number(r.count),
    })),
    hourly: hourly.map((r) => ({
      hour: r.hour.toISOString(),
      count: Number(r.count),
    })),
  });
}
