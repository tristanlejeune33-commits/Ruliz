import Redis from "ioredis";

/**
 * Redis client (best-effort cache layer).
 *
 * Si REDIS_URL n'est pas défini OU si Redis n'est pas joignable, l'app
 * doit continuer à fonctionner sans cache (juste un peu plus lente).
 *
 * Garde-fous :
 *  - `lazyConnect: true` → on ne se connecte que sur le 1er get/set
 *  - `maxRetriesPerRequest: 1` → on ne retry pas à l'infini une commande qui échoue
 *  - `retryStrategy` qui abandonne après 5 échecs (~10s) au lieu de spammer
 *  - listener `error` qui log UNE FOIS puis devient silencieux pour ne pas
 *    polluer les logs Railway avec un AggregateError par seconde
 */

const globalForRedis = globalThis as unknown as {
  redis?: Redis | null;
  redisErrorLogged?: boolean;
};

function buildRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 5) {
        // Abandon : on n'essaie plus, ioredis met le client en mode "end".
        return null;
      }
      // Backoff exponentiel jusqu'à 2s.
      return Math.min(times * 200, 2000);
    },
    reconnectOnError() {
      return false;
    },
  });

  client.on("error", (err) => {
    if (!globalForRedis.redisErrorLogged) {
      console.warn(
        "[redis] connexion impossible, l'app continue sans cache :",
        err instanceof Error ? err.message : err,
      );
      globalForRedis.redisErrorLogged = true;
    }
  });

  client.on("end", () => {
    // Connection abandonnée on log une fois pour info.
    if (!globalForRedis.redisErrorLogged) {
      console.warn("[redis] connexion abandonnée (retry strategy stopped)");
      globalForRedis.redisErrorLogged = true;
    }
  });

  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined ? globalForRedis.redis : buildRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
