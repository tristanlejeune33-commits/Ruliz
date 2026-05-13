import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { clearAdminDemoFlag } from "@/lib/admin-demo";
import { clearActiveRestaurantCookie } from "@/lib/active-restaurant";

/**
 * GET /api/admin/demo/exit — sortie du mode démo admin.
 *
 * Clear les deux cookies (admin_demo + active_restaurant) puis redirige
 * vers /admin avec un path relatif (cf. note dans /admin/demo/route.ts
 * sur le proxy localhost:8080 → 3000).
 */
export async function GET() {
  await requireAdmin();
  await clearAdminDemoFlag();
  await clearActiveRestaurantCookie();
  redirect("/admin");
}
