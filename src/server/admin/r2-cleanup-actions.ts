"use server";

import { prisma } from "@/lib/db";
import {
  deleteR2Batch,
  isR2Configured,
  listR2Keys,
} from "@/lib/r2";
import { requireAdmin } from "@/lib/session";

export type R2CleanupStats = {
  ok: true;
  totalInR2: number;
  totalReferencedDb: number;
  orphans: number;
  orphansOldEnough: number;
  totalBytesOrphan: number;
  deleted: number;
  failed: number;
  /** Mode dry-run = pas de delete réel, on retourne juste les stats */
  dryRun: boolean;
};

export type R2CleanupError = { ok: false; error: string };

/**
 * Scanne R2 + DB et identifie les images "orphelines" : présentes dans le
 * bucket mais référencées par aucune ligne en DB.
 *
 * Sources de référence parsées :
 *   - restaurants.logo_url
 *   - restaurants.banniere_url
 *   - qrcodes.png_url
 *   - produits.image_url
 *   - popups.image_url
 *   - boutique_produits.image_url
 *
 * Garde-fou : on ne considère orphelin que les keys créées il y a > 30 jours,
 * pour ne pas supprimer un fichier juste uploadé dont la ligne DB n'est pas
 * encore committée (cas de race condition rare mais possible).
 *
 * Mode :
 *   - dryRun = true (défaut)  → renvoie juste les stats, RIEN n'est supprimé
 *   - dryRun = false           → supprime réellement les orphelins anciens
 *
 * Réservé admin (logs d'audit côté Railway).
 */
export async function cleanupOrphanImages(opts?: {
  dryRun?: boolean;
  /** Âge minimum en jours pour considérer une key comme orpheline (défaut 30) */
  minAgeDays?: number;
}): Promise<R2CleanupStats | R2CleanupError> {
  await requireAdmin();

  if (!isR2Configured()) {
    return { ok: false, error: "R2 non configuré" };
  }

  const dryRun = opts?.dryRun ?? true;
  const minAgeDays = opts?.minAgeDays ?? 30;
  const cutoff = new Date(Date.now() - minAgeDays * 24 * 3600 * 1000);

  // === 1. Liste tous les objets R2 (préfixés restaurants/ ou boutique/) ===
  // On scanne en 2 calls pour avoir tous les espaces
  const [restosKeys, boutiqueKeys] = await Promise.all([
    listR2Keys("restaurants/"),
    listR2Keys("boutique/"),
  ]);
  const allKeys = [...restosKeys, ...boutiqueKeys];

  // === 2. Récupère toutes les URLs référencées en DB ===
  const referenced = new Set<string>();

  const addIfPresent = (url: string | null | undefined) => {
    if (url && url.trim().length > 0) referenced.add(url);
  };

  // restaurants : logo + bannière (raw SQL pour ne dépendre de rien)
  const restos = (await prisma.$queryRawUnsafe(
    `SELECT logo_url, banniere_url FROM restaurants`,
  )) as Array<{ logo_url: string | null; banniere_url: string | null }>;
  for (const r of restos) {
    addIfPresent(r.logo_url);
    addIfPresent(r.banniere_url);
  }

  // qrcodes
  const qrs = (await prisma.$queryRawUnsafe(
    `SELECT png_url FROM qrcodes WHERE png_url IS NOT NULL`,
  )) as Array<{ png_url: string }>;
  for (const q of qrs) addIfPresent(q.png_url);

  // produits
  const produits = (await prisma.$queryRawUnsafe(
    `SELECT image_url FROM produits WHERE image_url IS NOT NULL`,
  )) as Array<{ image_url: string }>;
  for (const p of produits) addIfPresent(p.image_url);

  // popups
  const popups = (await prisma.$queryRawUnsafe(
    `SELECT image_url FROM popups WHERE image_url IS NOT NULL`,
  )) as Array<{ image_url: string }>;
  for (const p of popups) addIfPresent(p.image_url);

  // boutique_produits
  const boutiqueProduits = (await prisma.$queryRawUnsafe(
    `SELECT image_url FROM boutique_produits WHERE image_url IS NOT NULL`,
  )) as Array<{ image_url: string }>;
  for (const p of boutiqueProduits) addIfPresent(p.image_url);

  // Lots roulette : stockés dans configJson de jeux (parsé du JSON)
  const jeux = (await prisma.$queryRawUnsafe(
    `SELECT config_json FROM jeux WHERE config_json IS NOT NULL`,
  )) as Array<{ config_json: unknown }>;
  for (const j of jeux) {
    const cfg = j.config_json as { lots?: Array<{ imageUrl?: string }> } | null;
    if (cfg?.lots && Array.isArray(cfg.lots)) {
      for (const lot of cfg.lots) addIfPresent(lot.imageUrl);
    }
  }

  // === 3. Convertit les URLs référencées en keys R2 ===
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const referencedKeys = new Set<string>();
  for (const url of referenced) {
    if (publicUrl && url.startsWith(publicUrl + "/")) {
      referencedKeys.add(url.slice(publicUrl.length + 1));
    }
  }

  // === 4. Identifie les orphelins ===
  const orphans = allKeys.filter((obj) => !referencedKeys.has(obj.key));
  const orphansOldEnough = orphans.filter(
    (obj) => obj.lastModified && obj.lastModified < cutoff,
  );

  const totalBytesOrphan = orphansOldEnough.reduce(
    (sum, o) => sum + o.size,
    0,
  );

  // === 5. Suppression (sauf en dry-run) ===
  let deleted = 0;
  let failed = 0;
  if (!dryRun && orphansOldEnough.length > 0) {
    const result = await deleteR2Batch(orphansOldEnough.map((o) => o.key));
    deleted = result.deleted;
    failed = result.failed;
    console.log(
      `[r2-cleanup] orphan cleanup : ${deleted} deleted, ${failed} failed, ` +
        `${(totalBytesOrphan / 1024 / 1024).toFixed(1)} MB freed`,
    );
  }

  return {
    ok: true,
    totalInR2: allKeys.length,
    totalReferencedDb: referencedKeys.size,
    orphans: orphans.length,
    orphansOldEnough: orphansOldEnough.length,
    totalBytesOrphan,
    deleted,
    failed,
    dryRun,
  };
}
