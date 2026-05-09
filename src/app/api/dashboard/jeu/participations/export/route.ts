import { NextResponse } from "next/server";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { exportParticipationsCsv } from "@/server/dashboard/jeu-participations";

/**
 * GET /api/dashboard/jeu/participations/export?jeuId=...
 * Renvoie un CSV téléchargeable de toutes les participations d'un jeu.
 * Sécurisé : vérifie que le restaurateur courant possède bien ce jeu.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jeuIdStr = url.searchParams.get("jeuId");
  if (!jeuIdStr) {
    return NextResponse.json({ error: "jeuId manquant" }, { status: 400 });
  }

  let jeuId: bigint;
  try {
    jeuId = BigInt(jeuIdStr);
  } catch {
    return NextResponse.json({ error: "jeuId invalide" }, { status: 400 });
  }

  const jeu = await prisma.jeu.findUnique({
    where: { id: jeuId },
    select: { restaurantId: true },
  });
  if (!jeu) {
    return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });
  }

  const owned = await assertRestaurantOwner(jeu.restaurantId);
  if (!owned) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const csv = await exportParticipationsCsv(jeuId);
  const filename = `participations-jeu-${jeuId}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
