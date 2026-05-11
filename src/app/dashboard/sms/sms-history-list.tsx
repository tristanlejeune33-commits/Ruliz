import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        <li
          key={c.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3"
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
              c.status === "sent"
                ? "bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                : c.status === "sending"
                  ? "bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]"
                  : "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]"
            }`}
          >
            {c.status === "sent" ? (
              <CheckCircle2 className="size-4" strokeWidth={1.75} />
            ) : c.status === "sending" ? (
              <Clock className="size-4" strokeWidth={1.75} />
            ) : (
              <XCircle className="size-4" strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{c.title}</p>
              <span className="text-xs text-[var(--text-muted)]">
                {format(new Date(c.sentAt ?? c.createdAt), "d MMM yyyy à HH:mm", {
                  locale: fr,
                })}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs italic text-[var(--text-secondary)]">
              « {c.messageTemplate} »
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="success">{c.totalSent} envoyés</Badge>
              {c.totalFailed > 0 && (
                <Badge variant="destructive">{c.totalFailed} échecs</Badge>
              )}
              {c.totalSkipped > 0 && (
                <Badge variant="secondary">{c.totalSkipped} ignorés</Badge>
              )}
              <span className="text-[var(--text-muted)]">
                · {c.tokensSpent} SMS utilisés
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
