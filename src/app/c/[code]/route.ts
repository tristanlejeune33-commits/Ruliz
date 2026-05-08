import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/url";

/**
 * Short URL for QR codes : `/c/{codeUnique}` → 302 to `/carte/{restaurantId}`.
 * The actual scan tracking happens on the carte route itself (where we know
 * the language).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const qr = await prisma.qrcode.findUnique({
    where: { codeUnique: code },
    select: { id: true, restaurantId: true, statut: true },
  });

  if (!qr || qr.statut !== "actif") {
    return new NextResponse("QR code introuvable ou désactivé.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const target = new URL(
    `/carte/${qr.restaurantId.toString()}?qr=${qr.id.toString()}`,
    getAppUrl(),
  );

  return NextResponse.redirect(target, 302);
}
