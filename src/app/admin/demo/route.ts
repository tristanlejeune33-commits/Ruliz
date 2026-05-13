import { redirect } from "next/navigation";
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
 * Important : on utilise `redirect()` de next/navigation qui produit un
 * redirect avec path RELATIF (header `Location: /dashboard` au lieu d'une
 * URL absolue). Le browser conserve son origin actuel — utile si le dev
 * tourne derrière un proxy (localhost:8080 → Next.js sur 3000) où une URL
 * absolue construite avec request.url casserait la nav.
 */
export async function GET() {
  const session = await requireAdmin();

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    redirect("/admin");
  }

  const restaurant = await ensureAdminDemoRestaurant(authUser.userId);
  await setAdminDemoFlag();
  await setActiveRestaurantCookie(restaurant.id);

  redirect("/dashboard");
}
