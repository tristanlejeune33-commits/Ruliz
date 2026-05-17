"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Mail,
  Rocket,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateSmartleadCsv,
  triggerEnrichmentPipeline,
  triggerSeedVariants,
  uploadProspectsCsv,
} from "@/server/admin/outreach-actions";

interface Props {
  campaign: string;
  /** Nombre de prospects en attente (queued) pour la campagne */
  queuedCount: number;
  /** Nombre de prospects prêts pour Smartlead (generated) */
  generatedCount: number;
  /** Y a-t-il déjà des variants seedés ? */
  hasVariants: boolean;
}

export function OutreachActions({
  campaign,
  queuedCount,
  generatedCount,
  hasVariants,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // ── 1) Upload CSV prospects ──────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Le fichier doit être un .csv");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("campaign", campaign);

    setBusyAction("upload");
    try {
      toast.info(`Import de ${file.name}…`, { duration: 30000 });
      const res = await uploadProspectsCsv(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `✅ Import terminé : ${res.data!.inserted} créés, ${res.data!.updated} maj, ${res.data!.skipped} ignorés (${res.data!.total} lignes)`,
        { duration: 8000 },
      );
      router.refresh();
    } finally {
      setBusyAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── 2) Seeder les 12 variants ────────────────────────────────────────
  function handleSeedVariants() {
    setBusyAction("seed");
    startTransition(async () => {
      const res = await triggerSeedVariants();
      setBusyAction(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `✅ Variants OK : ${res.data!.inserted} créés, ${res.data!.updated} mis à jour`,
      );
      router.refresh();
    });
  }

  // ── 3) Trigger enrichissement ────────────────────────────────────────
  function handleTriggerPipeline() {
    if (queuedCount === 0) {
      toast.info("Aucun prospect en attente. Lance d'abord l'import.");
      return;
    }
    if (!confirm(
      `Lancer l'enrichissement de ${Math.min(queuedCount, 500)} prospects ?\n\n` +
      `Cela va déclencher :\n` +
      `• Validation emails (gratuit)\n` +
      `• Scraping logos + menus (gratuit)\n` +
      `• Génération cartes via Anthropic (~$0.01/prospect)\n\n` +
      `Durée : ~1h30 pour 500 prospects.`,
    )) {
      return;
    }
    setBusyAction("trigger");
    startTransition(async () => {
      const res = await triggerEnrichmentPipeline({ campaign, limit: 500 });
      setBusyAction(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `🚀 Pipeline lancé : ${res.data!.enqueued} prospects en cours d'enrichissement. ` +
        `Suivez la progression sur cette page.`,
        { duration: 10000 },
      );
      router.refresh();
    });
  }

  // ── 4) Télécharger CSV Smartlead ─────────────────────────────────────
  function handleDownloadCsv() {
    setBusyAction("download");
    startTransition(async () => {
      const res = await generateSmartleadCsv({ campaign });
      setBusyAction(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      // Convert base64 → Blob → trigger download
      const { csvBase64, filename, rows } = res.data!;
      const binary = atob(csvBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`📥 ${filename} téléchargé (${rows} prospects)`);
    });
  }

  const busy = isPending || busyAction !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Rocket className="mr-2 inline size-4" />
          Pilotage de la campagne
        </CardTitle>
        <CardDescription>
          Lance les opérations one-shot depuis l'admin (zéro terminal nécessaire).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1) Upload CSV */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              1. Import prospects
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={busy}
              className="hidden"
              id="csv-upload"
            />
            <Button
              asChild={!busy}
              disabled={busy}
              size="sm"
              variant="outline"
              className="w-full"
            >
              {busy && busyAction === "upload" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Import…
                </span>
              ) : (
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mr-1.5 size-3.5" />
                  Upload CSV
                </label>
              )}
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              CSV : email, nom, ville, code_postal, adresse, telephone,
              site_web, logo_url, photo_cover, rating, nb_reviews, niveau_prix.
            </p>
          </div>

          {/* 2) Seed variants */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              2. Variants emails
            </p>
            <Button
              onClick={handleSeedVariants}
              disabled={busy}
              size="sm"
              variant={hasVariants ? "outline" : "default"}
              className="w-full"
            >
              {busy && busyAction === "seed" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Seed…
                </>
              ) : (
                <>
                  <Mail className="mr-1.5 size-3.5" />
                  {hasVariants ? "Re-seeder" : "Seeder les 12 variants"}
                </>
              )}
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              Insère 3 variants × 4 steps (J+0/J+3/J+7/J+14). Idempotent.
            </p>
          </div>

          {/* 3) Trigger enrichissement */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              3. Pipeline enrichissement
            </p>
            <Button
              onClick={handleTriggerPipeline}
              disabled={busy || queuedCount === 0}
              size="sm"
              variant={queuedCount > 0 ? "default" : "outline"}
              className="w-full"
            >
              {busy && busyAction === "trigger" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 size-3.5" />
                  Lancer ({queuedCount} queued)
                </>
              )}
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              Workers Inngest scrapent + génèrent cartes (~$0.01/prospect).
            </p>
          </div>

          {/* 4) Download CSV Smartlead */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              4. Export Smartlead
            </p>
            <Button
              onClick={handleDownloadCsv}
              disabled={busy || generatedCount === 0}
              size="sm"
              variant={generatedCount > 0 ? "default" : "outline"}
              className="w-full"
            >
              {busy && busyAction === "download" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Download className="mr-1.5 size-3.5" />
                  CSV Smartlead ({generatedCount})
                </>
              )}
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              CSV prêt à uploader : email, nom, ville, first_name, preview_url.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
