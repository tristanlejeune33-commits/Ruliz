import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
