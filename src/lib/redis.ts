import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  (process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      })
    : null);

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
