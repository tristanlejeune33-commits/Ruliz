"use client";

import { useState, useTransition } from "react";
import { HardDrive, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cleanupOrphanImages } from "@/server/admin/r2-cleanup-actions";

type Stats = {
  totalInR2: number;
  totalReferencedDb: number;
  orphans: number;
  orphansOldEnough: number;
  totalBytesOrphan: number;
  deleted: number;
  failed: number;
  dryRun: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Carte admin : audit + cleanup des images orphelines dans R2.
 *
 * Flow recommandé :
 *  1. Clic "Analyser" → scan dry-run, affiche stats
 *  2. Vérifie que les chiffres ont du sens
 *  3. Clic "Supprimer X orphelins" → cleanup réel
 *
 * Ne supprime QUE les fichiers > 30 jours ET non référencés en DB.
 */
export function R2CleanupCard() {
  const [pending, startTransition] = useTransition();
  const [stats, setStats] = useState<Stats | null>(null);

  const runAudit = (dryRun: boolean) => {
    startTransition(async () => {
      const result = await cleanupOrphanImages({ dryRun });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStats({
        totalInR2: result.totalInR2,
        totalReferencedDb: result.totalReferencedDb,
        orphans: result.orphans,
        orphansOldEnough: result.orphansOldEnough,
        totalBytesOrphan: result.totalBytesOrphan,
        deleted: result.deleted,
        failed: result.failed,
        dryRun: result.dryRun,
      });
      if (dryRun) {
        toast.success(
          `Audit terminé : ${result.orphansOldEnough} orphelins à supprimer (${formatBytes(result.totalBytesOrphan)}).`,
        );
      } else {
        toast.success(
          `Cleanup terminé : ${result.deleted} fichiers supprimés (${formatBytes(result.totalBytesOrphan)} libérés).`,
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30">
            <HardDrive className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle>Cleanup R2 · images orphelines</CardTitle>
            <CardDescription className="mt-1">
              Identifie et supprime les images stockées dans Cloudflare R2 qui
              ne sont plus référencées dans la base de données (anciennes
              versions remplacées, produits supprimés, restos archivés). Ne
              touche QUE les fichiers de plus de 30 jours pour éviter toute
              suppression accidentelle.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => runAudit(true)}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" strokeWidth={1.75} />
            )}
            Analyser (dry-run)
          </Button>
          {stats && !stats.dryRun ? null : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (
                  !confirm(
                    `Supprimer définitivement ${stats?.orphansOldEnough ?? "?"} fichiers orphelins de R2 ? Cette action est irréversible.`,
                  )
                ) {
                  return;
                }
                runAudit(false);
              }}
              disabled={pending || !stats || stats.orphansOldEnough === 0}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Supprimer{" "}
              {stats?.orphansOldEnough
                ? `${stats.orphansOldEnough} orphelins`
                : ""}
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid gap-2 rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] p-3 text-xs">
            <Row
              label="Fichiers dans R2 (total)"
              value={stats.totalInR2.toLocaleString("fr-FR")}
            />
            <Row
              label="Référencés en DB"
              value={stats.totalReferencedDb.toLocaleString("fr-FR")}
            />
            <Row
              label="Orphelins (tous âges)"
              value={stats.orphans.toLocaleString("fr-FR")}
            />
            <Row
              label="Orphelins > 30 jours (cleanup)"
              value={stats.orphansOldEnough.toLocaleString("fr-FR")}
              accent
            />
            <Row
              label={
                stats.dryRun
                  ? "À libérer en cas de cleanup"
                  : "Espace libéré"
              }
              value={formatBytes(stats.totalBytesOrphan)}
              accent
            />
            {!stats.dryRun && (
              <>
                <Row
                  label="Effectivement supprimés"
                  value={stats.deleted.toLocaleString("fr-FR")}
                />
                {stats.failed > 0 && (
                  <Row
                    label="Échecs"
                    value={stats.failed.toLocaleString("fr-FR")}
                    warning
                  />
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          warning
            ? "font-semibold text-[var(--neon-danger)]"
            : accent
              ? "font-semibold text-[var(--text-primary)]"
              : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
