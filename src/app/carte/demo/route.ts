import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/url";

/**
 * Public demo redirect — points to the first active restaurant we find.
 * Used by the marketing landing "Voir une carte démo" CTA.
 */
export async function GET(_req: Request) {
  // Prefer a Pro/Premium restaurant if available (richer cards), fallback to any.
  const restaurant =
    (await prisma.restaurant.findFirst({
      where: { statut: "actif", plan: { in: ["pro", "premium"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.restaurant.findFirst({
      where: { statut: "actif" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  const base = getAppUrl();

  if (!restaurant) {
    return NextResponse.redirect(new URL("/?demo=unavailable", base), 302);
  }

  return NextResponse.redirect(
    new URL(`/carte/${restaurant.id.toString()}`, base),
    302,
  );
}
