import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { clearAdminDemoFlag } from "@/lib/admin-demo";
import { clearActiveRestaurantCookie } from "@/lib/active-restaurant";

/**
 * GET /api/admin/demo/exit — sortie du mode démo admin.
 *
 * Clear les deux cookies (admin_demo + active_restaurant) puis redirige
 * vers /admin. Appelé depuis le bouton "Retour à l'admin" du bandeau
 * affiché dans le dashboard.
 */
export async function GET(request: Request) {
  await requireAdmin();
  await clearAdminDemoFlag();
  await clearActiveRestaurantCookie();
  return NextResponse.redirect(new URL("/admin", request.url));
}
