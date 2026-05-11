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
        restaurants: {
          select: { id: true, nom: true, plan: true, ville: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
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
