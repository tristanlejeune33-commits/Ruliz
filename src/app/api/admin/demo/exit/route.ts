import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { ADMIN_DEMO_COOKIE } from "@/lib/admin-demo";

/**
 * GET /api/admin/demo/exit — sortie du mode démo admin.
 *
 * Clear les deux cookies (admin_demo + active_restaurant) directement sur la
 * response, puis redirige vers /admin avec une URL construite via les headers
 * (cf. note dans /admin/demo/route.ts).
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const proto =
    request.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";

  const response = NextResponse.redirect(new URL("/admin", `${proto}://${host}`));
  response.cookies.delete(ADMIN_DEMO_COOKIE);
  response.cookies.delete("ruliz_active_restaurant");
  return response;
}
