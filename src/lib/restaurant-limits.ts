import "server-only";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";

/**
 * Détermine le plan "le plus élevé" d'un utilisateur (parmi tous ses restaurants).
 */
export async function getHighestPlanOfUser(userId: number): Promise<Plan> {
  const restos = await prisma.restaurant.findMany({
    where: { userId, statut: "actif" },
    select: { plan: true },
  });
  if (restos.some((r) => r.plan === "premium")) return "premium";
  if (restos.some((r) => r.plan === "pro")) return "pro";
  return "freemium";
}

/**
 * Retourne `true` si l'utilisateur peut encore créer un restaurant
 * étant donné son plan actuel.
 */
export async function canCreateRestaurant(userId: number): Promise<{
  ok: boolean;
  reason?: "limit_reached";
  current: number;
  max: number | null;
  plan: Plan;
}> {
  const [count, plan] = await Promise.all([
    prisma.restaurant.count({ where: { userId } }),
    getHighestPlanOfUser(userId),
  ]);
  const max = PLANS[plan].features.maxRestaurants;
  if (max !== null && count >= max) {
    return { ok: false, reason: "limit_reached", current: count, max, plan };
  }
  return { ok: true, current: count, max, plan };
}

export async function canAddTeamMember(userId: number): Promise<{
  ok: boolean;
  current: number;
  max: number | null;
  plan: Plan;
}> {
  const [count, plan] = await Promise.all([
    prisma.teamMember.count({ where: { userId } }),
    getHighestPlanOfUser(userId),
  ]);
  const max = PLANS[plan].features.maxTeamMembers;
  if (max !== null && count >= max) {
    return { ok: false, current: count, max, plan };
  }
  return { ok: true, current: count, max, plan };
}
