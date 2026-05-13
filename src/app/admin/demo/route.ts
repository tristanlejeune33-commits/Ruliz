import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ensureAdminDemoRestaurant, ADMIN_DEMO_COOKIE } from "@/lib/admin-demo";

/**
 * GET /admin/demo — point d'entrée du "mode démo admin".
 *
 * - Vérifie qu'on est admin
 * - Crée ou récupère le resto démo lié au compte admin
 * - Set les cookies DIRECTEMENT sur la NextResponse (pas via cookies().set()
 *   + redirect() de next/navigation qui peut perdre les cookies sur certaines
 *   stacks comme Railway derrière reverse proxy)
 * - Construit l'URL de redirect via les headers (x-forwarded-host) pour
 *   éviter le piège du port interne 8080 du container Railway
 */
export async function GET(request: NextRequest) {
  const session = await requireAdmin();

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });

  // Construit l'URL de redirect en respectant le host vu par le browser
  // (x-forwarded-host sur Railway, host header en local). Évite le port
  // 8080 interne du container.
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";

  if (!authUser?.userId) {
    return NextResponse.redirect(new URL("/admin", `${proto}://${host}`));
  }

  const restaurant = await ensureAdminDemoRestaurant(authUser.userId);

  const response = NextResponse.redirect(
    new URL("/dashboard", `${proto}://${host}`),
  );

  // Cookies set directement sur la response — garantit qu'ils sont inclus
  // dans le redirect 307 et lisibles par le serveur au prochain hit.
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(ADMIN_DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 60 * 60 * 8, // 8h
    path: "/",
  });
  response.cookies.set("ruliz_active_restaurant", restaurant.id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });

  return response;
}
