import "server-only";
import { prisma } from "@/lib/db";

/**
 * Récupère les KPIs live d'une campagne d'outreach.
 *
 * @param campaign - Identifiant `source` (ex: "pilote-2k-2026-05")
 */
export async function getOutreachStats(campaign: string) {
  // 1) Compte par statut workflow
  const grouped = await prisma.prospectRestaurant.groupBy({
    by: ["status"],
    where: { source: campaign },
    _count: { _all: true },
  });

  const counts: {
    queued: number;
    enriched: number;
    generated: number;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    failed: number;
  } = {
    queued: 0,
    enriched: 0,
    generated: 0,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    failed: 0,
  };

  let total = 0;
  for (const g of grouped) {
    if (g.status in counts) {
      counts[g.status as keyof typeof counts] = g._count._all;
    }
    total += g._count._all;
  }

  // 2) Taux dérivés
  const sentOrLater = counts.sent + counts.opened + counts.clicked + counts.converted;
  const openedOrLater = counts.opened + counts.clicked + counts.converted;
  const clickedOrLater = counts.clicked + counts.converted;

  const openRate = sentOrLater > 0 ? openedOrLater / sentOrLater : 0;
  const clickRate = sentOrLater > 0 ? clickedOrLater / sentOrLater : 0;
  const conversionRate = sentOrLater > 0 ? counts.converted / sentOrLater : 0;

  // 3) Top villes représentées
  const villesGroup = await prisma.prospectRestaurant.groupBy({
    by: ["ville"],
    where: { source: campaign, ville: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { ville: "desc" } },
    take: 10,
  });

  // 4) Performance par variant
  const variants = await prisma.emailVariant.findMany({
    where: { campaign },
    orderBy: [{ step: "asc" }, { variant: "asc" }],
    select: {
      id: true,
      step: true,
      variant: true,
      subject: true,
      sent: true,
      opened: true,
      clicked: true,
      replied: true,
      converted: true,
      active: true,
    },
  });

  return {
    total,
    counts,
    rates: {
      open: openRate,
      click: clickRate,
      conversion: conversionRate,
    },
    villes: villesGroup.map((v) => ({
      ville: v.ville ?? "—",
      count: v._count._all,
    })),
    variants,
  };
}

/** Liste paginée des prospects d'une campagne. */
export async function listProspects(opts: {
  campaign: string;
  status?: string;
  ville?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { campaign, status, ville, search, limit = 50, offset = 0 } = opts;

  const where: {
    source: string;
    status?: string;
    ville?: string;
    OR?: Array<{ email?: { contains: string; mode: "insensitive" } } | { nom?: { contains: string; mode: "insensitive" } }>;
  } = { source: campaign };

  if (status && status !== "all") where.status = status;
  if (ville) where.ville = ville;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { nom: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.prospectRestaurant.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { rating: "desc" },
        { nbReviews: "desc" },
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        nom: true,
        ville: true,
        rating: true,
        nbReviews: true,
        niveauPrix: true,
        status: true,
        cardToken: true,
        logoUrl: true,
        siteWeb: true,
        photoCover: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        convertedAt: true,
        errorMessage: true,
      },
    }),
    prisma.prospectRestaurant.count({ where }),
  ]);

  return { items, total };
}

/** Liste des campagnes existantes (distinct source). */
export async function listCampaigns() {
  const grouped = await prisma.prospectRestaurant.groupBy({
    by: ["source"],
    _count: { _all: true },
    orderBy: { _count: { source: "desc" } },
  });
  return grouped.map((g) => ({ source: g.source, count: g._count._all }));
}
