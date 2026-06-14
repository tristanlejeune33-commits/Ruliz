"use server";

import { z } from "zod";
import { getActingUserId } from "@/lib/impersonation";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Forme persistée : ordre des sections + sections masquées (par id). */
export type DashboardLayout = {
  order: string[];
  hidden: string[];
};

const layoutSchema = z.object({
  order: z.array(z.string().max(40)).max(20),
  hidden: z.array(z.string().max(40)).max(20),
});

/**
 * Sauvegarde la personnalisation de l'accueil dashboard pour l'utilisateur
 * courant (ordre + visibilité des sections). Non-bloquant côté UI : on
 * remonte juste {ok} et l'UI applique l'état localement de manière optimiste.
 *
 * Écriture en SQL brut pour rester robuste tant que le client Prisma local
 * n'a pas régénéré la colonne `dashboard_layout` (build Railway).
 */
export async function saveDashboardLayout(input: unknown): Promise<ActionResult> {
  await ensureRuntimeSchema();
  const parsed = layoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const acting = await getActingUserId();
  if (!acting) return { ok: false, error: "Non authentifié" };

  try {
    await prisma.$executeRaw`
      UPDATE "users"
      SET "dashboard_layout" = ${JSON.stringify(parsed.data)}::jsonb
      WHERE "id" = ${acting.actingUserId}
    `;
    return { ok: true };
  } catch (err) {
    console.error("[saveDashboardLayout] failed:", err);
    return { ok: false, error: "Échec de la sauvegarde" };
  }
}
