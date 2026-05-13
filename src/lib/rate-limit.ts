/**
 * Rate-limit in-memory pour les routes publiques (carte, API publique).
 *
 * Implémentation : Map<key, { count, resetAt }> avec fenêtre glissante
 * de N secondes. Auto-purge des entrées expirées tous les 100 hits pour
 * éviter de faire fuir la mémoire.
 *
 * Pourquoi pas Redis ? Le middleware Next.js 15 tourne en Edge runtime
 * par défaut, et `ioredis` (notre client Redis) n'est pas compatible Edge.
 * In-memory marche très bien tant qu'on a 1 instance Railway. Si on scale
 * horizontalement, on swap vers @upstash/ratelimit + Redis HTTP.
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
