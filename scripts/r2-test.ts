/**
 * Test rapide de la connexion R2 Cloudflare.
 *
 * Utilisation :
 *   railway run pnpm tsx scripts/r2-test.ts
 *
 * Le CLI Railway injecte les variables R2_* du service en cours.
 * Le script :
 *   1. Vérifie la présence de chaque var (sans afficher les valeurs)
 *   2. Tente un PUT d'un PNG 1px sur le bucket
 *   3. Affiche le succès (URL publique) ou l'erreur S3 brute
 *
 * Avantage : itération rapide sans redéploiement Railway. Quand le
 * test passe en local, les mêmes vars marcheront en prod.
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function check(name: string): string | null {
  const v = process.env[name]?.trim();
  if (!v) {
    console.log(`  ✗ ${name} : MANQUANT`);
    return null;
  }
  // On affiche juste la longueur + 4 premiers chars + 4 derniers, jamais le full
  const masked =
    v.length > 12 ? `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)` : `••• (${v.length} chars)`;
  console.log(`  ✓ ${name} : ${masked}`);
  return v;
}

async function main() {
  console.log("\n=== R2 ENV CHECK ===");
  const accountId = check("R2_ACCOUNT_ID");
  const accessKeyId = check("R2_ACCESS_KEY_ID");
  const secretAccessKey = check("R2_SECRET_ACCESS_KEY");
  const bucket = check("R2_BUCKET_NAME");
  const publicUrl = check("R2_PUBLIC_URL");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    console.error("\n❌ Variables manquantes. Ajoute-les sur Railway → Variables.");
    process.exit(1);
  }

  console.log("\n=== R2 PUT TEST ===");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  console.log(`  Endpoint : ${endpoint}`);
  console.log(`  Bucket   : ${bucket}`);

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  // PNG 1px transparent (67 bytes)
  const pngHex =
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082";
  const body = Buffer.from(pngHex, "hex");

  const key = `_diag/r2-test-${Date.now()}.png`;
  console.log(`  Key      : ${key}`);

  try {
    const res = await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "image/png",
      }),
    );
    console.log("\n✅ PUT SUCCESS");
    console.log(`  HTTP statut    : ${res.$metadata.httpStatusCode}`);
    console.log(`  Request ID     : ${res.$metadata.requestId ?? "n/a"}`);
    console.log(`  URL publique   : ${publicUrl.replace(/\/$/, "")}/${key}`);
    console.log("\n💡 Ouvre cette URL dans ton navigateur pour vérifier que le PNG est accessible.");
  } catch (err) {
    console.error("\n❌ PUT FAILED");
    if (err instanceof Error) {
      console.error(`  Type    : ${err.name}`);
      console.error(`  Message : ${err.message}`);
      // @ts-expect-error - SDK error has additional fields
      if (err.$metadata) {
        // @ts-expect-error
        console.error(`  HTTP    : ${err.$metadata.httpStatusCode}`);
      }
      // @ts-expect-error
      if (err.Code) {
        // @ts-expect-error
        console.error(`  Code    : ${err.Code}`);
      }
    } else {
      console.error(err);
    }
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
