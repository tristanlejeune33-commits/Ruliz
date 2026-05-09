import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getActingUserId } from "./impersonation";
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
 * Returns the current restaurant for the logged-in user (ou pour l'utilisateur
 * impersonné si admin en mode SAV).
 *
 * Resolution order:
 *   1. cookie value if owned by acting user
 *   2. first restaurant by createdAt
 * Throws redirect if no restaurant exists.
 */
export async function getCurrentRestaurant() {
  const session = await requireDashboard();
  const acting = await getActingUserId();
  if (!acting) redirect("/login");
  const userId = acting.actingUserId;

  // Vérifie qu'il y a au moins un restaurant pour ce user
  // (sinon onboarding requis — sauf en mode impersonation où on ne veut pas
  //  forcer l'admin à créer un resto pour le client)
  const requestedId = await getActiveRestaurantId();

  // Prefer cookie value, fall back to first owned.
  const restaurant = requestedId
    ? await prisma.restaurant.findFirst({
        where: { id: requestedId, userId },
      })
    : null;

  if (restaurant) return { session, restaurant };

  const fallback = await prisma.restaurant.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) {
    // En mode impersonation, on évite la redirection /onboarding car
    // l'admin n'est pas censé créer un resto au nom du client. À la place,
    // on stoppe l'impersonation et on retourne admin.
    if (acting.isImpersonating) redirect("/admin");
    redirect("/dashboard/onboarding");
  }

  return { session, restaurant: fallback };
}

/**
 * Ensures a restaurant ID is owned by the acting user (impersonné si applicable,
 * sinon le user courant).
 * Returns the restaurant if owned, else null.
 */
export async function assertRestaurantOwner(id: bigint) {
  const acting = await getActingUserId();
  if (!acting) return null;

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, userId: acting.actingUserId },
  });
  return restaurant;
}
