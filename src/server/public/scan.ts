import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { SupportedLang } from "@/server/translation/anthropic";

interface RecordScanOpts {
  restaurantId: bigint;
  qrcodeId?: bigint | null;
  lang: SupportedLang;
  userAgent?: string | null;
  pays?: string | null;
  /** IP du visiteur (Cloudflare/Vercel/Railway header). Sert à la dédup. */
  ip?: string | null;
}

/**
 * Dédup in-memory : fingerprint (restaurantId + IP + UA) → timestamp dernier
 * scan recordé. Si on revoit le même fingerprint dans la fenêtre TTL, on
 * skip l'insert.
 *
 * Pourquoi in-memory et pas DB :
 *   - Une lookup DB avant chaque insert = 2× les queries
 *   - Le bug actuel = 890 scans/jour parasites → veut un fix instantané
 *   - State per-process est OK : les bots qui hammer une URL spamment
 *     généralement le même node, et un déploiement reset le cache (fine)
 *
 * TTL 15 min : couvre la durée typique d'une session resto-visite (le
 * client revient sur la carte plusieurs fois pendant son repas — on ne
 * compte que la première fois). Plus que ça gênerait les coups de
 * couvert où plusieurs personnes scannent à la même table (IP partagée
 * du resto wifi) — 15 min est un compromis.
 */
const DEDUP_TTL_MS = 15 * 60 * 1000;
const dedupCache = new Map<string, number>();

function dedupKey(restaurantId: bigint, ip: string | null, ua: string | null): string {
  // Hash pour ne pas garder l'UA + IP en clair en mémoire (RGPD lite)
  return createHash("sha256")
    .update(`${restaurantId.toString()}|${ip ?? ""}|${ua ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

function shouldDedup(restaurantId: bigint, ip: string | null, ua: string | null): boolean {
  // Cleanup périodique : si la Map dépasse 5000 entrées, on dump les
  // entrées expirées. Évite la fuite mémoire sans cron.
  if (dedupCache.size > 5000) {
    const now = Date.now();
    for (const [k, t] of dedupCache.entries()) {
      if (now - t > DEDUP_TTL_MS) dedupCache.delete(k);
    }
  }
  const key = dedupKey(restaurantId, ip, ua);
  const last = dedupCache.get(key);
  const now = Date.now();
  if (last && now - last < DEDUP_TTL_MS) {
    return true; // dédup → skip
  }
  dedupCache.set(key, now);
  return false;
}

/**
 * Insert a row in the partitioned `scans` table. Designed to be called from
 * `waitUntil()` so it never blocks the public menu response.
 *
 * Inclut une dédup in-memory sur (restaurantId, IP, UA) avec fenêtre 15 min
 * pour empêcher un bot qui hammer la même URL ou un client qui refresh
 * 50 fois en 5 min de gonfler le compteur.
 */
export async function recordScan(opts: RecordScanOpts) {
  // Dédup : skip silencieusement si on a déjà vu ce visiteur récemment
  if (shouldDedup(opts.restaurantId, opts.ip ?? null, opts.userAgent ?? null)) {
    return;
  }

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
    // Ne JAMAIS throw un scan raté ne doit pas casser la réponse publique.
    console.warn("[scan] insert failed:", e);
  }
}
