import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireDashboard } from "./session";

const COOKIE_NAME = "ruliz_active_restaurant";

export async function getActiveRestaurantId(): Promise<bigint | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function setActiveRestaurantCookie(id: bigint) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function clearActiveRestaurantCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Returns the current restaurant for the logged-in user.
 * Resolution order:
 *   1. cookie value if owned by user
 *   2. first restaurant by createdAt
 * Throws redirect if no restaurant exists.
 */
export async function getCurrentRestaurant() {
  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) redirect("/dashboard/onboarding");

  const requestedId = await getActiveRestaurantId();

  // Prefer cookie value, fall back to first owned.
  const restaurant = requestedId
    ? await prisma.restaurant.findFirst({
        where: { id: requestedId, userId: authUser.userId },
      })
    : null;

  if (restaurant) return { session, restaurant };

  const fallback = await prisma.restaurant.findFirst({
    where: { userId: authUser.userId },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) redirect("/dashboard/onboarding");

  return { session, restaurant: fallback };
}

/**
 * Ensures a restaurant ID is owned by the current user.
 * Returns the restaurant if owned, else null.
 */
export async function assertRestaurantOwner(id: bigint) {
  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true, role: true },
  });
  if (!authUser?.userId) return null;

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, userId: authUser.userId },
  });
  return restaurant;
}
