"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function debugSaveHoraires(input: {
  restaurantId: string;
  start: string;
  end: string;
}): Promise<{
  ok: boolean;
  error?: string;
  steps: Array<{ name: string; ok: boolean; detail?: string }>;
  before?: Record<string, string | null>;
  after?: Record<string, string | null>;
}> {
  await requireAdmin();
  const steps: Array<{ name: string; ok: boolean; detail?: string }> = [];

  let bigId: bigint;
  try {
    bigId = BigInt(input.restaurantId);
    steps.push({ name: "Parse restaurant ID", ok: true, detail: bigId.toString() });
  } catch {
    return {
      ok: false,
      error: "Invalid restaurant ID",
      steps,
    };
  }

  // === Étape 1 : lit l'état AVANT
  let before: Record<string, string | null> = {};
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT
        lunch_start, lunch_end,
        dinner_start, dinner_end,
        happy_hour_start, happy_hour_end
      FROM "restaurants" WHERE id = $1`,
      bigId,
    )) as Array<Record<string, string | null>>;
    before = rows[0] ?? {};
    steps.push({
      name: "SELECT actuel",
      ok: true,
      detail: JSON.stringify(before),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "SELECT actuel",
      ok: false,
      detail: msg,
    });
    return { ok: false, error: `SELECT failed: ${msg}`, steps };
  }

  // === Étape 2 : ALTER TABLE pour s'assurer que les colonnes existent
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "happy_hour_start" VARCHAR(5) DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_end"   VARCHAR(5) DEFAULT '19:00';
    `);
    steps.push({ name: "ALTER TABLE ADD COLUMN", ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "ALTER TABLE ADD COLUMN",
      ok: false,
      detail: msg,
    });
  }

  // === Étape 3 : UPDATE raw SQL
  try {
    const count = await prisma.$executeRawUnsafe(
      `UPDATE "restaurants" SET
         "happy_hour_start" = $2,
         "happy_hour_end" = $3
       WHERE "id" = $1`,
      bigId,
      input.start,
      input.end,
    );
    steps.push({
      name: "UPDATE raw SQL",
      ok: true,
      detail: `Rows affected: ${count}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "UPDATE raw SQL",
      ok: false,
      detail: msg,
    });
    return { ok: false, error: `UPDATE failed: ${msg}`, steps, before };
  }

  // === Étape 4 : re-SELECT pour vérifier
  let after: Record<string, string | null> = {};
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT
        lunch_start, lunch_end,
        dinner_start, dinner_end,
        happy_hour_start, happy_hour_end
      FROM "restaurants" WHERE id = $1`,
      bigId,
    )) as Array<Record<string, string | null>>;
    after = rows[0] ?? {};
    steps.push({
      name: "SELECT après UPDATE",
      ok: true,
      detail: JSON.stringify(after),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "SELECT après UPDATE",
      ok: false,
      detail: msg,
    });
  }

  // === Vérification : les valeurs correspondent-elles ?
  const actualStart = after.happy_hour_start;
  const actualEnd = after.happy_hour_end;
  if (actualStart === input.start && actualEnd === input.end) {
    steps.push({
      name: "Vérification valeurs",
      ok: true,
      detail: `start=${actualStart} end=${actualEnd}`,
    });
    return { ok: true, steps, before, after };
  } else {
    steps.push({
      name: "Vérification valeurs",
      ok: false,
      detail: `attendu start=${input.start} end=${input.end}, obtenu start=${actualStart} end=${actualEnd}`,
    });
    return {
      ok: false,
      error: `Les valeurs ne correspondent pas après UPDATE`,
      steps,
      before,
      after,
    };
  }
}
