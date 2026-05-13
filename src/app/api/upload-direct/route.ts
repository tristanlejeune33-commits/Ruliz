import { NextResponse } from "next/server";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import {
  buildR2Key,
  deleteFromR2ByUrl,
  extractR2Key,
  isR2Configured,
  uploadBuffer,
} from "@/lib/r2";
import { requireAdmin } from "@/lib/session";

/**
 * Server-side upload proxy.
 *
 * Pourquoi pas une presigned URL ? Parce que les buckets R2 n'ont pas de CORS
 * activé par défaut, et un PUT direct depuis le browser échoue silencieusement.
 * En proxant via Next.js, on évite complètement le souci CORS · le fichier
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
  // URL de l'image à remplacer (optionnel) · l'ImageUploader la passe quand
  // l'utilisateur remplace une image existante. On la supprime après l'upload
  // de la nouvelle pour ne pas laisser de déchets dans R2 (delete on replace).
  const previousUrl = form.get("previousUrl");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (typeof kind !== "string") {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!["logo", "banniere", "produit", "qrcode", "boutique"].includes(kind)) {
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

  let key: string;

  // === Kind "boutique" : produits boutique globaux gérés par admin ===
  // Pas de restaurantId requis, mais auth admin obligatoire.
  if (kind === "boutique") {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json(
        { error: "Accès admin requis pour la boutique" },
        { status: 403 },
      );
    }
    key = buildR2Key({
      restaurantId: BigInt(0), // sentinelle, le path sera boutique-prefixed
      kind: "boutique",
      filename: file.name,
    });
  } else {
    // === Kinds resto-scoped (logo / banniere / produit / qrcode) ===
    if (typeof restaurantId !== "string") {
      return NextResponse.json(
        { error: "restaurantId manquant" },
        { status: 400 },
      );
    }
    let bigId: bigint;
    try {
      bigId = BigInt(restaurantId);
    } catch {
      return NextResponse.json(
        { error: "Identifiant invalide" },
        { status: 400 },
      );
    }

    const owned = await assertRestaurantOwner(bigId);
    if (!owned)
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    key = buildR2Key({
      restaurantId: bigId,
      kind: kind as "logo" | "banniere" | "produit" | "qrcode",
      filename: file.name,
    });
  }

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
        error: `Upload R2 échoué · ${detail}`,
        hint:
          "Causes courantes : R2_ACCOUNT_ID erroné, clé/secret avec mauvaises permissions (besoin Object Read+Write sur le bucket), ou R2_BUCKET_NAME inexistant.",
      },
      { status: 502 },
    );
  }

  if (!publicUrl) {
    return NextResponse.json({ error: "R2 indisponible" }, { status: 503 });
  }

  // === Delete on replace ===
  // Si l'utilisateur remplace une image existante, on supprime l'ancienne
  // de R2 pour éviter le storage drift. Garde-fou : on vérifie que la key
  // de l'ancienne image appartient bien au même scope (resto ou boutique)
  // que la nouvelle pour empêcher qu'un user supprime l'image d'un autre.
  if (typeof previousUrl === "string" && previousUrl.length > 0) {
    const previousKey = extractR2Key(previousUrl);
    if (previousKey) {
      const sameScope = (() => {
        // Boutique : la nouvelle key commence par "boutique/" et l'ancienne aussi
        if (kind === "boutique") return previousKey.startsWith("boutique/");
        // Resto-scoped : ancienne key doit être dans le même dossier resto
        if (typeof restaurantId === "string") {
          return previousKey.startsWith(`restaurants/${restaurantId}/`);
        }
        return false;
      })();
      if (sameScope && previousKey !== key) {
        // Best-effort : on log mais on ne bloque pas la réponse si delete échoue
        await deleteFromR2ByUrl(previousUrl).catch((err) =>
          console.warn("[upload-direct] delete previous failed:", err),
        );
      }
    }
  }

  return NextResponse.json({ publicUrl, key });
}
