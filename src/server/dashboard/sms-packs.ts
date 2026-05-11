import "server-only";
import { prisma } from "@/lib/db";

/**
 * Config des packs SMS proposés à l'achat.
 *
 * 2 sources possibles :
 *  1. La table sms_pack_settings en DB (édité par l'admin via /admin/settings)
 *  2. Les valeurs par défaut DEFAULT_SMS_PACKS ci-dessous (fallback si DB vide)
 *
 * Fichier séparé de sms-actions.ts car Next.js refuse l'export de constantes
 * depuis un fichier "use server" (seules les async functions sont autorisées).
 * Ici, getActiveSmsPacks() est async, donc utilisable côté server actions OU
 * directement dans un Server Component.
 */

export interface SmsPack {
  id: string;
  size: number;
  priceCentimes: number;
  label: string;
  badge?: string;
}

/**
 * Valeurs par défaut — utilisées si la DB est vide ou injoignable.
 * Tristan achète sur Brevo ~0.030€/SMS, revend avec marge :
 *  - 100 SMS  → 9.90€  (0.099€/SMS) → marge ×3.3
 *  - 500 SMS  → 39.90€ (0.080€/SMS) → marge ×2.7
 *  - 1000 SMS → 69.90€ (0.070€/SMS) → marge ×2.3
 *  - 5000 SMS → 299€   (0.060€/SMS) → marge ×2.0
 */
export const DEFAULT_SMS_PACKS: SmsPack[] = [
  { id: "starter", size: 100, priceCentimes: 990, label: "Pack Découverte" },
  {
    id: "boost",
    size: 500,
    priceCentimes: 3990,
    label: "Pack Boost",
    badge: "Populaire",
  },
  { id: "growth", size: 1000, priceCentimes: 6990, label: "Pack Croissance" },
  {
    id: "scale",
    size: 5000,
    priceCentimes: 29900,
    label: "Pack Maxi",
    badge: "Économie",
  },
];

/** Compatibilité avec l'ancien export — DEFAULT_SMS_PACKS sous l'alias SMS_PACKS. */
export const SMS_PACKS = DEFAULT_SMS_PACKS;

/**
 * Auto-ensure de la table sms_pack_settings + seed avec les défauts si vide.
 * Idempotent, appelé en début de chaque action qui lit la table.
 */
let packsSchemaEnsured = false;
async function ensurePacksSchema(): Promise<void> {
  if (packsSchemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_pack_settings" (
        "pack_id" VARCHAR(20) PRIMARY KEY,
        "size" INTEGER NOT NULL,
        "price_centimes" INTEGER NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "badge" VARCHAR(50),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Seed des valeurs par défaut si absentes
    for (const pack of DEFAULT_SMS_PACKS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_pack_settings (pack_id, size, price_centimes, label, badge, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (pack_id) DO NOTHING`,
        pack.id,
        pack.size,
        pack.priceCentimes,
        pack.label,
        pack.badge ?? null,
      );
    }
    packsSchemaEnsured = true;
  } catch (err) {
    console.warn("[sms-packs] ensurePacksSchema failed:", err);
  }
}

/**
 * Retourne les packs SMS actifs depuis la DB.
 * Si la DB est vide ou injoignable → fallback sur DEFAULT_SMS_PACKS.
 * Ordre : starter, boost, growth, scale (par taille croissante).
 */
export async function getActiveSmsPacks(): Promise<SmsPack[]> {
  await ensurePacksSchema();

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT pack_id AS "id", size, price_centimes AS "priceCentimes",
              label, badge
       FROM sms_pack_settings
       WHERE active = TRUE
       ORDER BY size ASC`,
    )) as Array<{
      id: string;
      size: number;
      priceCentimes: number;
      label: string;
      badge: string | null;
    }>;

    if (rows.length === 0) return DEFAULT_SMS_PACKS;

    return rows.map((r) => ({
      id: r.id,
      size: r.size,
      priceCentimes: r.priceCentimes,
      label: r.label,
      badge: r.badge ?? undefined,
    }));
  } catch (err) {
    console.warn("[sms-packs] getActiveSmsPacks failed, using defaults:", err);
    return DEFAULT_SMS_PACKS;
  }
}

/**
 * Récupère un pack par son ID (lecture seule, utilisée côté checkout Stripe).
 * Retourne null si le pack n'existe pas ou est inactif.
 */
export async function getSmsPackById(packId: string): Promise<SmsPack | null> {
  const packs = await getActiveSmsPacks();
  return packs.find((p) => p.id === packId) ?? null;
}

/**
 * Liste TOUS les packs (actifs + inactifs) — pour l'admin uniquement.
 * Utilisé dans /admin/settings pour afficher la grille d'édition.
 */
export async function listAllSmsPacks(): Promise<
  Array<SmsPack & { active: boolean }>
> {
  await ensurePacksSchema();

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT pack_id AS "id", size, price_centimes AS "priceCentimes",
              label, badge, active
       FROM sms_pack_settings
       ORDER BY size ASC`,
    )) as Array<{
      id: string;
      size: number;
      priceCentimes: number;
      label: string;
      badge: string | null;
      active: boolean;
    }>;

    if (rows.length === 0) {
      return DEFAULT_SMS_PACKS.map((p) => ({ ...p, active: true }));
    }

    return rows.map((r) => ({
      id: r.id,
      size: r.size,
      priceCentimes: r.priceCentimes,
      label: r.label,
      badge: r.badge ?? undefined,
      active: r.active,
    }));
  } catch (err) {
    console.warn("[sms-packs] listAllSmsPacks failed, using defaults:", err);
    return DEFAULT_SMS_PACKS.map((p) => ({ ...p, active: true }));
  }
}
