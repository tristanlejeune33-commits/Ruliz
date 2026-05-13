import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check endpoint utilisé par Railway pour décider si l'app doit
 * être redémarrée. On vérifie les dépendances critiques :
 *
 *   - DB Postgres : SELECT 1 (timeout 2s)
 *   - Redis : PING (timeout 1s, optionnel — Redis peut être down sans
 *     casser l'app, mais on remonte l'info en `checks`)
 *
 * Statut HTTP :
 *   - 200 si la DB répond
 *   - 503 si la DB est down → Railway redémarre automatiquement le service
 *
 * Redis down n'est PAS critique : l'app dégrade gracieusement (pas de
 * cache), donc on retourne quand même 200 mais avec `checks.redis = false`.
 */

type Check = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkDb(): Promise<Check> {
  const start = Date.now();
  try {
    await withTimeout(prisma.$queryRawUnsafe(`SELECT 1`), 2000);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkRedis(): Promise<Check> {
  if (!redis) return { ok: false, error: "Redis non configuré" };
  const start = Date.now();
  try {
    const pong = await withTimeout(redis.ping(), 1000);
    return {
      ok: pong === "PONG",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [db, redisCheck] = await Promise.all([checkDb(), checkRedis()]);

  // La DB est OBLIGATOIRE : si elle est down, on renvoie 503 pour que
  // Railway redémarre l'app. Redis est best-effort (l'app marche sans).
  const isHealthy = db.ok;

  const body = {
    status: isHealthy ? "ok" : "degraded",
    service: "ruliz",
    timestamp: new Date().toISOString(),
    uptime: typeof process.uptime === "function" ? process.uptime() : null,
    checks: {
      db,
      redis: redisCheck,
    },
  };

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
