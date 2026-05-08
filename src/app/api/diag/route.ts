import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Diagnostic endpoint — admin-only.
 * Affiche l'état des dépendances externes pour debug rapide en prod.
 *
 * Accès : /api/diag — requiert d'être loggé en admin.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { role: true } } },
  });
  if (authUser?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const present = (k: string) =>
    !!(process.env[k] && process.env[k]!.trim().length > 0);

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
      },
      stripe: {
        secret: present("STRIPE_SECRET_KEY"),
        webhook: present("STRIPE_WEBHOOK_SECRET"),
        proPriceId: present("STRIPE_PRO_PRICE_ID"),
        premiumPriceId: present("STRIPE_PREMIUM_PRICE_ID"),
      },
      resend: present("RESEND_API_KEY"),
    },
  });
}
