"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  Check,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
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
import { FAB } from "@/components/ui/fab";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  createQrcode,
  deleteQrcode,
  setQrcodeLabel,
  setQrcodeStatut,
} from "@/server/dashboard/qrcode-actions";

interface QrcodeRow {
  id: string;
  codeUnique: string;
  pngUrl: string | null;
  label: string | null;
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
    "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
};

const STATUT_META: Record<string, { label: string; classes: string }> = {
  actif: {
    label: "Actif",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  inactif: STATUT_FALLBACK,
  perdu: {
    label: "Perdu",
    classes:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
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

  const handleLabel = (id: string, label: string) => {
    startTransition(async () => {
      const res = await setQrcodeLabel({ id, label });
      if (res.ok) {
        toast.success(label.trim() ? "QR code renommé" : "Nom retiré");
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
      {/* Toolbar : SegmentedControl mobile-first + bouton "Générer" desktop only.
          Sur mobile le bouton est promu en FAB en bas (cf. JSX en bas du return). */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <SegmentedControl<StatutFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "tous", label: <span>Tous <span className="font-mono tabular-nums opacity-60">{counts.tous}</span></span> },
            { value: "actif", label: <span>Actifs <span className="font-mono tabular-nums opacity-60">{counts.actif}</span></span> },
            { value: "inactif", label: <span>Inactifs <span className="font-mono tabular-nums opacity-60">{counts.inactif}</span></span> },
            { value: "perdu", label: <span>Perdus <span className="font-mono tabular-nums opacity-60">{counts.perdu}</span></span> },
          ]}
          size="compact"
          ariaLabel="Filtre statut"
          className="w-full lg:w-auto"
        />
        <div className="hidden items-center gap-2 lg:flex">
          {!empty && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/qrcodes/print" target="_blank">
                <Printer className="size-3.5" />
                Imprimer
              </Link>
            </Button>
          )}
          <Button onClick={handleCreate} disabled={pending} size="sm">
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Générer un QR code
          </Button>
        </div>
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
        <div
          data-onboarding-anchor="qr-display"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((qr) => (
            <QrcodeCard
              key={qr.id}
              qr={qr}
              pending={pending}
              onDownload={() => handleDownload(qr)}
              onStatut={(s) => handleStatut(qr.id, s)}
              onDelete={() => handleDelete(qr.id)}
              onLabel={(label) => handleLabel(qr.id, label)}
            />
          ))}
        </div>
      )}

      {/* FAB mobile : "Générer un QR code" (le bouton inline est hidden lg:) */}
      <FAB
        icon={<Plus />}
        label="Générer un QR code"
        onClick={handleCreate}
      />
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
          ? "bg-[var(--bg-glass-strong)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-glass-hover)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0 font-mono text-[10px] tabular-nums",
          active
            ? tone === "success"
              ? "bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
              : tone === "danger"
                ? "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]"
                : "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]"
            : "bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
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
  onLabel,
}: {
  qr: QrcodeRow;
  pending: boolean;
  onDownload: () => void;
  onStatut: (s: "actif" | "inactif" | "perdu") => void;
  onDelete: () => void;
  onLabel: (label: string) => void;
}) {
  const meta = STATUT_META[qr.statut] ?? STATUT_FALLBACK;
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(qr.label ?? "");
  const labelInputRef = useRef<HTMLInputElement>(null);

  const commitLabel = () => {
    setEditingLabel(false);
    if (labelDraft.trim() !== (qr.label ?? "")) {
      onLabel(labelDraft.trim());
    }
  };
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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingLabel ? (
              <div className="flex items-center gap-1">
                <input
                  ref={labelInputRef}
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitLabel();
                    if (e.key === "Escape") {
                      setLabelDraft(qr.label ?? "");
                      setEditingLabel(false);
                    }
                  }}
                  maxLength={80}
                  placeholder="Table 5, Vitrine…"
                  className="min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitLabel}
                  aria-label="Enregistrer le nom"
                >
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLabelDraft(qr.label ?? "");
                  setEditingLabel(true);
                  setTimeout(() => labelInputRef.current?.focus(), 0);
                }}
                className="group/label flex max-w-full items-center gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "truncate text-sm font-semibold tracking-tight",
                    !qr.label &&
                      "font-normal italic text-[var(--text-muted)]",
                  )}
                >
                  {qr.label || "Nommer ce QR"}
                </span>
                <Pencil className="size-3 shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover/label:opacity-100" />
              </button>
            )}
            <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">
              {qr.codeUnique}
            </p>
          </div>
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
