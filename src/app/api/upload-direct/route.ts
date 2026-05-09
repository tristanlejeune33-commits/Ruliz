import { NextResponse } from "next/server";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { buildR2Key, isR2Configured, uploadBuffer } from "@/lib/r2";

/**
 * Server-side upload proxy.
 *
 * Pourquoi pas une presigned URL ? Parce que les buckets R2 n'ont pas de CORS
 * activé par défaut, et un PUT direct depuis le browser échoue silencieusement.
 * En proxant via Next.js, on évite complètement le souci CORS — le fichier
 * arrive en multipart côté serveur, on le streame vers R2 en Node, c'est fini.
 *
 * Limite à 5 MB côté Next (config par défaut OK pour ce cas).
 */
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Stockage R2 non configuré côté serveur. Colle une URL d'image à la place.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = form.get("file");
  const restaurantId = form.get("restaurantId");
  const kind = form.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (typeof restaurantId !== "string" || typeof kind !== "string") {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!["logo", "banniere", "produit", "qrcode"].includes(kind)) {
    return NextResponse.json({ error: "Type d'image inconnu" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "L'image dépasse 5 MB" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Type d'image non supporté (${file.type})` },
      { status: 400 },
    );
  }

  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const key = buildR2Key({
    restaurantId: bigId,
    kind: kind as "logo" | "banniere" | "produit" | "qrcode",
    filename: file.name,
  });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let publicUrl: string | null = null;
  try {
    publicUrl = await uploadBuffer({
      key,
      body: buffer,
      contentType: file.type,
    });
  } catch (err) {
    console.error("[upload-direct] R2 putObject failed:", err);
    const detail =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json(
      {
        error: `Upload R2 échoué — ${detail}`,
        hint:
          "Causes courantes : R2_ACCOUNT_ID erroné, clé/secret avec mauvaises permissions (besoin Object Read+Write sur le bucket), ou R2_BUCKET_NAME inexistant.",
      },
      { status: 502 },
    );
  }

  if (!publicUrl) {
    return NextResponse.json({ error: "R2 indisponible" }, { status: 503 });
  }

  return NextResponse.json({ publicUrl, key });
}
