"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  QrCode as QrCodeIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  createQrcode,
  deleteQrcode,
  setQrcodeStatut,
} from "@/server/dashboard/qrcode-actions";

interface QrcodeRow {
  id: string;
  codeUnique: string;
  pngUrl: string | null;
  statut: string;
  scanTotal: number;
  scanMois: number;
  createdAt: string;
}

interface QrcodesViewProps {
  restaurantId: string;
  qrcodes: QrcodeRow[];
}

type StatutFilter = "tous" | "actif" | "inactif" | "perdu";

const STATUT_FALLBACK = {
  label: "Inactif",
  classes:
    "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)]",
};

const STATUT_META: Record<string, { label: string; classes: string }> = {
  actif: {
    label: "Actif",
    classes:
      "border-[oklch(0.7_0.18_145)]/30 bg-[oklch(0.7_0.18_145)]/15 text-[oklch(0.75_0.18_145)]",
  },
  inactif: STATUT_FALLBACK,
  perdu: {
    label: "Perdu",
    classes:
      "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
  },
};

export function QrcodesView({ restaurantId, qrcodes }: QrcodesViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<StatutFilter>("tous");

  const counts = useMemo(() => {
    return {
      tous: qrcodes.length,
      actif: qrcodes.filter((q) => q.statut === "actif").length,
      inactif: qrcodes.filter((q) => q.statut === "inactif").length,
      perdu: qrcodes.filter((q) => q.statut === "perdu").length,
    };
  }, [qrcodes]);

  const filtered = useMemo(() => {
    if (filter === "tous") return qrcodes;
    return qrcodes.filter((q) => q.statut === filter);
  }, [qrcodes, filter]);

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createQrcode({ restaurantId });
      if (res.ok) {
        toast.success("QR code généré.");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleStatut = (id: string, statut: "actif" | "inactif" | "perdu") => {
    startTransition(async () => {
      const res = await setQrcodeStatut({ id, statut });
      if (res.ok) {
        toast.success("Statut mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteQrcode(id);
      if (res.ok) {
        toast.success("QR code supprimé");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDownload = (qr: QrcodeRow) => {
    if (!qr.pngUrl) return;
    const a = document.createElement("a");
    a.href = qr.pngUrl;
    a.download = `ruliz-${qr.codeUnique}.png`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  const empty = qrcodes.length === 0;
  const filteredEmpty = !empty && filtered.length === 0;

  return (
    <div className="space-y-5">
      {/* Toolbar : filtre + action principale */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-1.5 pl-3">
        <div className="flex flex-wrap items-center gap-1">
          <FilterTab
            active={filter === "tous"}
            onClick={() => setFilter("tous")}
            label="Tous"
            count={counts.tous}
          />
          <FilterTab
            active={filter === "actif"}
            onClick={() => setFilter("actif")}
            label="Actifs"
            count={counts.actif}
            tone="success"
          />
          <FilterTab
            active={filter === "inactif"}
            onClick={() => setFilter("inactif")}
            label="Inactifs"
            count={counts.inactif}
          />
          <FilterTab
            active={filter === "perdu"}
            onClick={() => setFilter("perdu")}
            label="Perdus"
            count={counts.perdu}
            tone="danger"
          />
        </div>
        <Button onClick={handleCreate} disabled={pending} size="sm">
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Générer un QR code
        </Button>
      </div>

      {/* Liste */}
      {empty ? (
        <EmptyState pending={pending} onCreate={handleCreate} />
      ) : filteredEmpty ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun QR code dans ce filtre.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setFilter("tous")}>
            Voir tous les QR codes
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((qr) => (
            <QrcodeCard
              key={qr.id}
              qr={qr}
              pending={pending}
              onDownload={() => handleDownload(qr)}
              onStatut={(s) => handleStatut(qr.id, s)}
              onDelete={() => handleDelete(qr.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FilterTab({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
        active
          ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-subtle)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0 font-mono text-[10px] tabular-nums",
          active
            ? tone === "success"
              ? "bg-[oklch(0.7_0.18_145)]/15 text-[oklch(0.75_0.18_145)]"
              : tone === "danger"
                ? "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]"
                : "bg-[var(--accent)]/15 text-[var(--accent)]"
            : "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------

function QrcodeCard({
  qr,
  pending,
  onDownload,
  onStatut,
  onDelete,
}: {
  qr: QrcodeRow;
  pending: boolean;
  onDownload: () => void;
  onStatut: (s: "actif" | "inactif" | "perdu") => void;
  onDelete: () => void;
}) {
  const meta = STATUT_META[qr.statut] ?? STATUT_FALLBACK;
  return (
    <Card className="group overflow-hidden p-0 transition-all duration-200 hover:shadow-lg">
      <div className="relative flex aspect-square items-center justify-center border-b border-[var(--border-subtle)] bg-gradient-to-br from-white to-neutral-50 p-6">
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
            meta.classes,
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {meta.label}
        </span>
        {qr.pngUrl ? (
          <Image
            src={qr.pngUrl}
            alt={`QR code ${qr.codeUnique}`}
            width={240}
            height={240}
            unoptimized
            className="size-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <QrCodeIcon className="size-10" />
            <span className="text-xs">QR indisponible</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-sm font-medium tracking-tight">
            {qr.codeUnique}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                className="size-7 shrink-0"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDownload} disabled={!qr.pngUrl}>
                <Download /> Télécharger PNG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {qr.statut !== "actif" && (
                <DropdownMenuItem onClick={() => onStatut("actif")}>
                  Activer
                </DropdownMenuItem>
              )}
              {qr.statut !== "inactif" && (
                <DropdownMenuItem onClick={() => onStatut("inactif")}>
                  Désactiver
                </DropdownMenuItem>
              )}
              {qr.statut !== "perdu" && (
                <DropdownMenuItem onClick={() => onStatut("perdu")}>
                  Marquer perdu
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
                  >
                    <Trash2 /> Supprimer
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce QR code ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tous les scans déjà comptabilisés seront conservés mais ne
                      pourront plus être attribués. Action irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Créé le {format(new Date(qr.createdAt), "d MMM yyyy", { locale: fr })}
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3">
          <Stat
            label="Ce mois"
            value={qr.scanMois}
            icon={<Activity className="size-3 text-[var(--accent)]" />}
          />
          <Stat label="Total" value={qr.scanTotal} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="w-full"
          disabled={!qr.pngUrl}
        >
          <Download className="size-3.5" />
          Télécharger
        </Button>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
          {value.toLocaleString("fr-FR")}
        </p>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function EmptyState({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate: () => void;
}) {
  return (
    <Card className="relative isolate flex flex-col items-center gap-4 overflow-hidden p-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <span className="relative flex size-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
        <QrCodeIcon className="size-6 text-[var(--accent)]" />
      </span>
      <div className="relative max-w-md space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Pas encore de QR code
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Génère ton premier QR code pour le coller sur tes tables, en vitrine,
          ou sur tes sets de table. Chaque scan sera tracké automatiquement.
        </p>
      </div>
      <Button onClick={onCreate} disabled={pending} className="relative">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Générer mon premier QR code
      </Button>
    </Card>
  );
}
