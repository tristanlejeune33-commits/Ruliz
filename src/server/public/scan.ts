import "server-only";
import { prisma } from "@/lib/db";
import type { SupportedLang } from "@/server/translation/anthropic";

interface RecordScanOpts {
  restaurantId: bigint;
  qrcodeId?: bigint | null;
  lang: SupportedLang;
  userAgent?: string | null;
  pays?: string | null;
}

/**
 * Insert a row in the partitioned `scans` table. Designed to be called from
 * `waitUntil()` so it never blocks the public menu response.
 */
export async function recordScan(opts: RecordScanOpts) {
  try {
    await prisma.scan.create({
      data: {
        restaurantId: opts.restaurantId,
        qrcodeId: opts.qrcodeId ?? null,
        lang: opts.lang,
        userAgent: opts.userAgent?.slice(0, 500) ?? null,
        pays: opts.pays?.slice(0, 2) ?? null,
      },
    });
  } catch (e) {
    // Ne JAMAIS throw · un scan raté ne doit pas casser la réponse publique.
    console.warn("[scan] insert failed:", e);
  }
}
