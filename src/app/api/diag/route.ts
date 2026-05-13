import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isR2Configured, uploadBuffer } from "@/lib/r2";

/**
 * Diagnostic endpoint · **admin uniquement** (verrouillé).
 *
 * Avant : accessible à tout user connecté, ce qui exposait :
 *   - L'énumération des services configurés (Stripe, Anthropic, R2, Brevo…)
 *   - L'URL R2 publique (recon réseau)
 *   - Un PUT R2 réel via ?r2test=1 → pollution de bucket triviale
 *
 * Maintenant : check session + role 'admin' → 401/403 sinon. Pas de
 * redirect() ici (on est dans une route handler API, on veut un vrai
 * status code pas un 307).
 */
export async function GET(req: Request) {
  // 1. Auth : doit être connecté
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authz : doit être admin (rôle métier sur la table users)
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { role: true } } },
  });
  if (authUser?.user?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden · admin role required" },
      { status: 403 },
    );
  }

  const present = (k: string) =>
    !!(process.env[k] && process.env[k]!.trim().length > 0);

  const url = new URL(req.url);
  const runR2Test = url.searchParams.get("r2test") === "1";

  let r2TestResult:
    | { ok: true; publicUrl: string }
    | { ok: false; error: string }
    | { skipped: true } = { skipped: true };

  if (runR2Test) {
    if (!isR2Configured()) {
      r2TestResult = { ok: false, error: "R2 non configuré (variables manquantes)" };
    } else {
      try {
        const tinyPng = Buffer.from(
          "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
          "hex",
        );
        const url = await uploadBuffer({
          key: `_diag/test-${Date.now()}.png`,
          body: tinyPng,
          contentType: "image/png",
        });
        if (url) {
          r2TestResult = { ok: true, publicUrl: url };
        } else {
          r2TestResult = { ok: false, error: "uploadBuffer a retourné null" };
        }
      } catch (err) {
        r2TestResult = {
          ok: false,
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        };
      }
    }
  }

  return NextResponse.json({
    node: process.version,
    env: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    services: {
      database: present("DATABASE_URL"),
      redis: present("REDIS_URL"),
      anthropic: present("ANTHROPIC_API_KEY"),
      inngestEvent: present("INNGEST_EVENT_KEY"),
      inngestSignature: present("INNGEST_SIGNING_KEY"),
      r2: {
        accountId: present("R2_ACCOUNT_ID"),
        accessKeyId: present("R2_ACCESS_KEY_ID"),
        secretAccessKey: present("R2_SECRET_ACCESS_KEY"),
        bucketName: present("R2_BUCKET_NAME"),
        publicUrl: present("R2_PUBLIC_URL"),
        publicUrlSample:
          process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? null,
      },
      stripe: {
        secret: present("STRIPE_SECRET_KEY"),
        webhook: present("STRIPE_WEBHOOK_SECRET"),
        proPriceId: present("STRIPE_PRO_PRICE_ID"),
        premiumPriceId: present("STRIPE_PREMIUM_PRICE_ID"),
      },
      resend: present("RESEND_API_KEY"),
    },
    r2Test: r2TestResult,
    hint: runR2Test
      ? null
      : "Ajoute ?r2test=1 à l'URL pour tester un PUT réel vers R2",
  });
}
