import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { checkRateLimit } from "@/lib/rate-limit";

const PROTECTED_PREFIXES = ["/admin", "/dashboard"];

// === Rate-limit config ===
// 60 req/min/IP sur la carte publique. C'est large pour un humain qui scroll
// (~10 navigations/min en haute activité) mais ça bloque les bots à 50 req/s.
const CARTE_LIMIT = 60;
const CARTE_WINDOW_MS = 60_000;

/**
 * Extrait l'IP client de manière fiable, en priorité depuis les headers
 * définis par Cloudflare / proxy Railway, sinon fallback "anonymous".
 */
function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anon";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === 1. Rate-limit sur /carte/* (route publique massivement scannée) ===
  // Pas de rate-limit en mode preview (?preview=true depuis le dashboard
  // pour que le restaurateur puisse tester sans se bloquer lui-même).
  if (pathname.startsWith("/carte/")) {
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";
    if (!isPreview) {
      const ip = getClientIp(request);
      const result = checkRateLimit(
        `carte:${ip}`,
        CARTE_LIMIT,
        CARTE_WINDOW_MS,
      );
      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Trop de requêtes. Réessaie dans quelques secondes.",
            retryAfter: result.retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": result.retryAfter.toString(),
              "X-RateLimit-Limit": result.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
            },
          },
        );
      }
      // Pas de blocage, mais on expose les headers pour les debugs
      const res = NextResponse.next();
      res.headers.set("X-RateLimit-Limit", result.limit.toString());
      res.headers.set("X-RateLimit-Remaining", result.remaining.toString());
      return res;
    }
  }

  // === 2. Auth gate sur /admin et /dashboard ===
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    // Inclus /carte/* pour le rate-limit (route publique critique)
    "/carte/:path*",
  ],
};
