import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repairRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Route admin pour forcer la réparation du schéma DB.
 * Utile quand ensureRuntimeSchema() a planté en silence sur une ALTER
 * et que certaines colonnes manquent en DB (genre `restaurants.timezone`).
 *
 * Usage :
 *   GET /api/admin/repair-schema
 *   → Auth requise (admin seulement)
 *   → Force re-run de tous les ALTER TABLE IF NOT EXISTS
 *   → Liste les colonnes vérifiées (introspection DB)
 */
export async function GET() {
  await requireAdmin();
  await repairRuntimeSchema();

  // Vérification post-repair : liste les colonnes critiques en DB
  const checks = await Promise.all([
    checkColumn("restaurants", "timezone"),
    checkColumn("categories", "schedule_type"),
    checkColumn("categories", "schedule_start"),
    checkColumn("categories", "schedule_end"),
    checkColumn("categories", "schedule_days"),
    checkColumn("produits", "schedule_type"),
    checkColumn("produits", "schedule_start"),
    checkColumn("produits", "schedule_end"),
    checkColumn("produits", "schedule_days"),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Schema repair completed",
    columns: checks,
  });
}

/** Helper : check si une colonne existe en DB via information_schema. */
async function checkColumn(
  table: string,
  column: string,
): Promise<{ table: string; column: string; exists: boolean }> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      table,
      column,
    );
    const exists = !!(rows[0] && Number(rows[0].count) > 0);
    return { table, column, exists };
  } catch (err) {
    console.warn(`[repair-schema] checkColumn(${table}, ${column}) failed:`, err);
    return { table, column, exists: false };
  }
}
