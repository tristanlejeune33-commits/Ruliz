import "server-only";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// `getSignedUrl` types its first arg with a slightly different generic than
// `S3Client` exposes, but at runtime they're the same. Cast safely.
type SignableClient = Parameters<typeof getSignedUrl>[0];

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

let client: S3Client | null = null;

export function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function isR2Configured() {
  return !!(accountId && accessKeyId && secretAccessKey && bucket && publicUrl);
}

export interface SignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export async function generatePresignedUpload(opts: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<SignedUploadResult | null> {
  const c = getR2Client();
  if (!c || !bucket || !publicUrl) return null;

  const expiresIn = opts.expiresIn ?? 60 * 5; // 5 min

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });

  const uploadUrl = await getSignedUrl(c as unknown as SignableClient, cmd, {
    expiresIn,
  });

  return {
    uploadUrl,
    publicUrl: `${publicUrl.replace(/\/$/, "")}/${opts.key}`,
    key: opts.key,
    expiresIn,
  };
}

export function buildR2Key(opts: {
  restaurantId: bigint | string;
  kind: "logo" | "banniere" | "produit" | "qrcode" | "boutique";
  filename: string;
}) {
  const safe = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = Date.now();
  if (opts.kind === "boutique") {
    return `boutique/${stamp}-${safe}`;
  }
  return `restaurants/${opts.restaurantId}/${opts.kind}/${stamp}-${safe}`;
}

export async function uploadBuffer(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string | null> {
  const c = getR2Client();
  if (!c || !bucket || !publicUrl) return null;

  await c.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );

  return `${publicUrl.replace(/\/$/, "")}/${opts.key}`;
}

/**
 * Extrait la R2 key d'une URL publique. null si l'URL ne correspond pas
 * à notre R2_PUBLIC_URL (= image externe ou URL malformée → on ne touche pas).
 *
 * Exemple : R2_PUBLIC_URL = "https://pub-xxx.r2.dev"
 *   → URL "https://pub-xxx.r2.dev/restaurants/12/produit/167x-pizza.jpg"
 *   → key "restaurants/12/produit/167x-pizza.jpg"
 */
export function extractR2Key(url: string): string | null {
  if (!publicUrl || !url) return null;
  const base = publicUrl.replace(/\/$/, "");
  if (!url.startsWith(base + "/")) return null;
  return url.slice(base.length + 1);
}

/**
 * Supprime un objet R2 par sa key. Best-effort : log les erreurs mais ne
 * throw pas (pour ne jamais bloquer un flux d'upload légitime à cause d'un
 * souci de cleanup).
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const c = getR2Client();
  if (!c || !bucket) return false;
  if (!key || key.includes("..")) return false; // garde-fou contre les paths bizarres

  try {
    await c.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch (err) {
    console.warn(`[r2] delete failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Supprime un objet R2 à partir de son URL publique. No-op si l'URL ne
 * pointe pas sur notre bucket (ex: URL externe collée par l'utilisateur).
 */
export async function deleteFromR2ByUrl(url: string): Promise<boolean> {
  const key = extractR2Key(url);
  if (!key) return false;
  return deleteFromR2(key);
}

/**
 * Liste toutes les R2 keys avec un prefix donné (ex: "restaurants/").
 * Gère la pagination automatiquement. Utilisé par le cleanup orphelins.
 *
 * Attention : pour un gros bucket, ça peut prendre du temps. Le cleanup
 * tourne en background (cron) donc OK.
 */
export async function listR2Keys(prefix: string): Promise<
  Array<{ key: string; lastModified: Date | null; size: number }>
> {
  const c = getR2Client();
  if (!c || !bucket) return [];

  const results: Array<{
    key: string;
    lastModified: Date | null;
    size: number;
  }> = [];
  let continuationToken: string | undefined;

  do {
    const resp = await c.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key) continue;
      results.push({
        key: obj.Key,
        lastModified: obj.LastModified ?? null,
        size: obj.Size ?? 0,
      });
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  return results;
}

/**
 * Supprime plusieurs objets en batch (max 1000 par requête, l'API S3 limite).
 * Best-effort, log les erreurs partielles.
 */
export async function deleteR2Batch(keys: string[]): Promise<{
  deleted: number;
  failed: number;
}> {
  const c = getR2Client();
  if (!c || !bucket || keys.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  // Découpe en lots de 1000 (limite S3)
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    try {
      const resp = await c.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map((k) => ({ Key: k })),
            Quiet: false,
          },
        }),
      );
      deleted += resp.Deleted?.length ?? 0;
      failed += resp.Errors?.length ?? 0;
      if (resp.Errors && resp.Errors.length > 0) {
        console.warn("[r2] batch delete errors:", resp.Errors.slice(0, 5));
      }
    } catch (err) {
      console.warn("[r2] batch delete failed:", err);
      failed += batch.length;
    }
  }

  return { deleted, failed };
}
