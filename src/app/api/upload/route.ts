import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { buildR2Key, generatePresignedUpload, isR2Configured } from "@/lib/r2";

const requestSchema = z.object({
  restaurantId: z.string(),
  filename: z.string().min(1).max(120),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif|gif)$/, "Type d'image non supporté"),
  kind: z.enum(["logo", "banniere", "produit", "qrcode"]),
});

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Le stockage R2 n'est pas configuré. Renseigne les variables R2_* dans l'env.",
      },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(parsed.data.restaurantId);
  } catch {
    return NextResponse.json({ error: "Identifiant restaurant invalide" }, { status: 400 });
  }

  const owned = await assertRestaurantOwner(restoBigId);
  if (!owned) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const key = buildR2Key({
    restaurantId: restoBigId,
    kind: parsed.data.kind,
    filename: parsed.data.filename,
  });

  const result = await generatePresignedUpload({
    key,
    contentType: parsed.data.contentType,
  });

  if (!result) {
    return NextResponse.json({ error: "R2 indisponible" }, { status: 503 });
  }

  return NextResponse.json(result);
}
