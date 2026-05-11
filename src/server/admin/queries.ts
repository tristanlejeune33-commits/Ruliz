import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ClientListFilters = {
  search?: string;
  statut?: "actif" | "suspendu" | "archive" | "demo_terminee" | "all";
  plan?: "freemium" | "pro" | "premium" | "all";
  limit?: number;
  offset?: number;
};

export type ClientListItem = Awaited<ReturnType<typeof listClients>>["items"][number];

/**
 * Liste paginée des clients (role !== admin) avec leurs restos agrégés.
 */
export async function listClients(filters: ClientListFilters = {}) {
  const { search = "", statut = "all", plan = "all", limit = 50, offset = 0 } = filters;

  const where: Prisma.UserWhereInput = {
    role: "client",
  };

  if (statut !== "all") where.statut = statut;

  if (search.trim()) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { prenom: { contains: search, mode: "insensitive" } },
      { nom: { contains: search, mode: "insensitive" } },
      {
        restaurants: {
          some: {
            nom: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  if (plan !== "all") {
    where.restaurants = { some: { plan } };
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        ville: true,
        statut: true,
        demoActive: true,
        createdAt: true,
        lastLoginAt: true,
        stripeCustomerId: true,
        restaurants: {
          select: {
            id: true,
            nom: true,
            plan: true,
            ville: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // === Enrichissement parallèle : revenus + scans agrégés par client ===
  // 1. Revenus boutique (commandes payées via Stripe)
  // 2. Revenus SMS (packs achetés)
  // 3. Scans uniques + scans totaux agrégés sur tous les restaurants du user

  const userIds = items.map((u) => u.id);
  const restoIdsByUser = new Map<number, bigint[]>();
  for (const u of items) {
    restoIdsByUser.set(
      u.id,
      u.restaurants.map((r) => r.id),
    );
  }
  const allRestoIds = items.flatMap((u) => u.restaurants.map((r) => r.id));

  if (userIds.length === 0 || allRestoIds.length === 0) {
    return {
      items: items.map((u) => ({
        ...u,
        revenueCentimes: 0,
        scansTotal: 0,
        scansUniques: 0,
      })),
      total,
    };
  }

  // Revenus boutique par user (commandes payées)
  const boutiqueRevenue = (await prisma.$queryRawUnsafe(
    `SELECT user_id AS "userId", COALESCE(SUM(total_centimes), 0)::int AS "totalCentimes"
     FROM boutique_commandes
     WHERE user_id = ANY($1::int[]) AND paid_at IS NOT NULL
     GROUP BY user_id`,
    userIds,
  )) as Array<{ userId: number; totalCentimes: number }>;
  const boutiqueByUser = new Map(boutiqueRevenue.map((r) => [r.userId, r.totalCentimes]));

  // Revenus SMS par restaurant (achats payés) — agrégés par user
  const smsRevenueByResto = (await prisma.$queryRawUnsafe(
    `SELECT restaurant_id AS "restaurantId", COALESCE(SUM(price_paid_centimes), 0)::int AS "totalCentimes"
     FROM sms_credit_purchases
     WHERE restaurant_id = ANY($1::bigint[]) AND status = 'paid'
     GROUP BY restaurant_id`,
    allRestoIds,
  ).catch(() => [])) as Array<{ restaurantId: bigint; totalCentimes: number }>;
  const smsByResto = new Map(
    smsRevenueByResto.map((r) => [r.restaurantId.toString(), r.totalCentimes]),
  );

  // Scans totaux + uniques par restaurant
  // Approximation "unique" : DISTINCT user_agent + pays (~visiteur unique)
  const scansByResto = (await prisma.$queryRawUnsafe(
    `SELECT restaurant_id AS "restaurantId",
            COUNT(*)::int AS "scansTotal",
            COUNT(DISTINCT COALESCE(user_agent, '') || '|' || COALESCE(pays, ''))::int AS "scansUniques"
     FROM scans
     WHERE restaurant_id = ANY($1::bigint[])
     GROUP BY restaurant_id`,
    allRestoIds,
  ).catch(() => [])) as Array<{
    restaurantId: bigint;
    scansTotal: number;
    scansUniques: number;
  }>;
  const scansByRestoMap = new Map(
    scansByResto.map((r) => [
      r.restaurantId.toString(),
      { total: r.scansTotal, uniques: r.scansUniques },
    ]),
  );

  const enriched = items.map((u) => {
    const restoIds = (restoIdsByUser.get(u.id) ?? []).map((id) => id.toString());
    let smsTotal = 0;
    let scansTotal = 0;
    let scansUniques = 0;
    for (const rid of restoIds) {
      smsTotal += smsByResto.get(rid) ?? 0;
      const sc = scansByRestoMap.get(rid);
      if (sc) {
        scansTotal += sc.total;
        scansUniques += sc.uniques;
      }
    }
    return {
      ...u,
      revenueCentimes: (boutiqueByUser.get(u.id) ?? 0) + smsTotal,
      scansTotal,
      scansUniques,
    };
  });

  return { items: enriched, total };
}

/**
 * Fiche complète d'un client avec restaurants, jeux, logs.
 */
export async function getClientById(id: number) {
  // Garantit que les colonnes ajoutées tardivement (sms_sender, onboarding_*)
  // existent en DB avant que Prisma ne les sélectionne via include
  const { ensureRuntimeSchema } = await import("@/lib/ensure-runtime-schema");
  await ensureRuntimeSchema();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      restaurants: {
        include: {
          qrcodes: { select: { id: true, codeUnique: true, scanTotal: true, scanMois: true, statut: true } },
          jeux: { select: { id: true, nom: true, actif: true, createdAt: true } },
          _count: { select: { categories: true } },
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      authUser: {
        include: {
          sessions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              ipAddress: true,
              userAgent: true,
              createdAt: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;
  return user;
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientById>>>;
