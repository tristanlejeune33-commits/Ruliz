import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  ensureAdminDemoRestaurant,
  setAdminDemoFlag,
} from "@/lib/admin-demo";
import { setActiveRestaurantCookie } from "@/lib/active-restaurant";

/**
 * GET /admin/demo — point d'entrée du "mode démo admin".
 *
 * - Vérifie qu'on est admin (sinon redirect /login ou /dashboard via guard).
 * - Crée ou récupère le resto démo lié au compte admin.
 * - Set les cookies (admin_demo + active_restaurant).
 * - Redirige vers /dashboard.
 *
 * On GET (vs POST) car appelé depuis un <Link> sidebar. Idempotent côté
 * DB (ensureAdminDemoRestaurant), donc safe à invoquer plusieurs fois.
 */
export async function GET(request: Request) {
  const session = await requireAdmin();

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const restaurant = await ensureAdminDemoRestaurant(authUser.userId);
  await setAdminDemoFlag();
  await setActiveRestaurantCookie(restaurant.id);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
