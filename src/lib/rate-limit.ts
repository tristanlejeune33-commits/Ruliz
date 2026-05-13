/**
 * Rate-limit hybride : in-memory (Edge-compatible) + Redis (Node-only).
 *
 * Deux entrées :
 *   - `checkRateLimit(key, limit, windowMs)` : in-memory, Edge-compatible
 *     → utilisée par le middleware (qui tourne en Edge runtime)
 *   - `checkRateLimitRedis(key, limit, windowMs)` : Redis-backed, async,
 *     Node-only → utilisée par les server actions sensibles (octroi de
 *     plan offert, etc.) pour garantir le rate-limit même si on scale
 *     horizontalement Railway (chaque instance partagerait alors le store
 *     in-memory et un attaquant pourrait contourner par round-robin)
 *
 * Implémentation : Map<key, { count, resetAt }> avec fenêtre glissante
 * de N secondes. Auto-purge des entrées expirées tous les 100 hits pour
 * éviter de faire fuir la mémoire.
 *
 * Le store est sur `globalThis` pour survivre aux hot reloads en dev.
 */

type RateLimitEntry = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __ruliz_ratelimit_store: Map<string, RateLimitEntry> | undefined;
  // eslint-disable-next-line no-var
  var __ruliz_ratelimit_hits: number | undefined;
}

const store: Map<string, RateLimitEntry> =
  globalThis.__ruliz_ratelimit_store ?? new Map();
if (!globalThis.__ruliz_ratelimit_store) {
  globalThis.__ruliz_ratelimit_store = store;
}

function gc() {
  globalThis.__ruliz_ratelimit_hits =
    (globalThis.__ruliz_ratelimit_hits ?? 0) + 1;
  if (globalThis.__ruliz_ratelimit_hits % 100 !== 0) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Timestamp Unix ms */
  resetAt: number;
  /** Secondes avant reset (pour Retry-After) */
  retryAfter: number;
};

/**
 * Check + increment du compteur pour `key`.
 *
 * @param key      Identifiant unique (typiquement `${route}:${ip}`)
 * @param limit    Nombre max de hits dans la fenêtre (ex: 30)
 * @param windowMs Durée de la fenêtre en ms (ex: 60_000 = 1 min)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  gc();
  const now = Date.now();
  const existing = store.get(key);

  // Pas d'entrée OU fenêtre expirée → nouvelle fenêtre
  if (!existing || existing.resetAt < now) {
    const entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  // Fenêtre en cours
  existing.count += 1;
  store.set(key, existing);

  const allowed = existing.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfter: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Variante Redis-backed pour les server actions sensibles (Node runtime only).
 *
 * Utilise INCR + EXPIRE atomique pour un compteur distribué :
 *   1. INCR sur la clé → retourne le nouveau count
 *   2. Si count === 1 (1ère fois) → EXPIRE pour fixer la fenêtre
 *   3. allowed = count <= limit
 *
 * En cas d'indisponibilité Redis (down, timeout), fallback transparent vers
 * la version in-memory pour ne pas bloquer les actions légitimes.
 */
export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  // Import dynamique : évite que ce module soit bundlé pour Edge runtime
  // (middleware) où ioredis ne fonctionne pas.
  try {
    const { redis } = await import("./redis");
    if (
      !redis ||
      redis.status === "end" ||
      redis.status === "close" ||
      redis.status === "wait"
    ) {
      // Redis pas dispo → fallback in-memory (silencieux, déjà loggé 1x)
      return checkRateLimit(key, limit, windowMs);
    }

    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // Première requête de la fenêtre → définit l'expiration
      await redis.pexpire(redisKey, windowMs);
    }
    const ttl = await redis.pttl(redisKey);
    const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    };
  } catch {
    // Redis indisponible → fallback silencieux in-memory.
    // L'erreur est déjà loggée 1x par lib/redis.ts.
    return checkRateLimit(key, limit, windowMs);
  }
}
