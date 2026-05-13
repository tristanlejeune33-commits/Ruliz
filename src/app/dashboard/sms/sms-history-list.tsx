"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cancelScheduledSmsCampaign } from "@/server/dashboard/sms-actions";

interface Campaign {
  id: string;
  title: string;
  messageTemplate: string;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  tokensSpent: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  scheduledAt?: string | null;
}

interface SmsHistoryListProps {
  campaigns: Campaign[];
}

export function SmsHistoryList({ campaigns }: SmsHistoryListProps) {
  if (campaigns.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 py-6 text-center text-sm text-[var(--text-muted)]">
        Aucune campagne envoyée pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {campaigns.map((c) => (
        <CampaignRow key={c.id} campaign={c} />
      ))}
    </ul>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const c = campaign;
  const isScheduled = c.status === "scheduled";
  const isCancelled = c.status === "cancelled";

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelScheduledSmsCampaign(c.id);
      if (res.ok) {
        toast.success("Campagne programmée annulée");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const iconConfig = (() => {
    if (c.status === "scheduled")
      return {
        Icon: CalendarClock,
        cls: "bg-[var(--accent)]/15 text-[var(--accent)]",
      };
    if (c.status === "sending" || c.status === "draft")
      return {
        Icon: Clock,
        cls: "bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
      };
    if (c.status === "cancelled")
      return {
        Icon: XCircle,
        cls: "bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
      };
    if (c.status === "sent")
      return {
        Icon: CheckCircle2,
        cls: "bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
      };
    return {
      Icon: XCircle,
      cls: "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
    };
  })();
  const Icon = iconConfig.Icon;

  return (
    <li className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${iconConfig.cls}`}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{c.title}</p>
          <span className="text-xs text-[var(--text-muted)]">
            {isScheduled && c.scheduledAt ? (
              <>
                📅 Prévu le{" "}
                {format(new Date(c.scheduledAt), "d MMM yyyy à HH:mm", {
                  locale: fr,
                })}
              </>
            ) : (
              format(
                new Date(c.sentAt ?? c.createdAt),
                "d MMM yyyy à HH:mm",
                { locale: fr },
              )
            )}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs italic text-[var(--text-secondary)]">
          « {c.messageTemplate} »
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {isScheduled && (
            <Badge variant="default" className="bg-[var(--accent)] text-white">
              Programmée
            </Badge>
          )}
          {isCancelled && <Badge variant="secondary">Annulée</Badge>}
          {c.status === "sent" && (
            <>
              <Badge variant="success">{c.totalSent} envoyés</Badge>
              {c.totalFailed > 0 && (
                <Badge variant="destructive">{c.totalFailed} échecs</Badge>
              )}
              {c.totalSkipped > 0 && (
                <Badge variant="secondary">{c.totalSkipped} ignorés</Badge>
              )}
              <span className="text-[var(--text-muted)]">
                {c.tokensSpent} SMS utilisés
              </span>
            </>
          )}
        </div>

        {/* Bouton Annuler pour les campagnes programmées */}
        {isScheduled && (
          <div className="mt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  Annuler la programmation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Annuler cette campagne programmée ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Le SMS « {c.title} » ne sera pas envoyé à l&apos;heure
                    prévue. Tu pourras le re-programmer si tu changes
                    d&apos;avis.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Garder programmée</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>
                    Annuler la campagne
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </li>
  );
}
