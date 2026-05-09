import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge, type Plan as UiPlan } from "@/components/shared/status-badge";
import { PLANS, type Plan } from "@/lib/plans";

interface SubscriptionStatusCardProps {
  plan: Plan;
  status: string | null;
  currentPeriodEnd: Date | null;
  hasSubscription: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai gratuit",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
  unpaid: "Impayé",
};

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  active: {
    bg: "rgba(34, 197, 94, 0.12)",
    text: "rgb(34, 197, 94)",
    icon: CheckCircle2,
  },
  trialing: {
    bg: "rgba(59, 130, 246, 0.12)",
    text: "rgb(59, 130, 246)",
    icon: Clock,
  },
  past_due: {
    bg: "rgba(245, 158, 11, 0.18)",
    text: "rgb(217, 119, 6)",
    icon: AlertTriangle,
  },
  unpaid: {
    bg: "rgba(239, 68, 68, 0.18)",
    text: "rgb(220, 38, 38)",
    icon: AlertTriangle,
  },
  canceled: {
    bg: "rgba(107, 114, 128, 0.18)",
    text: "rgb(75, 85, 99)",
    icon: XCircle,
  },
  incomplete: {
    bg: "rgba(245, 158, 11, 0.18)",
    text: "rgb(217, 119, 6)",
    icon: AlertTriangle,
  },
};

/**
 * Card status d'abonnement avec :
 * - Plan + status badge coloré
 * - Compteur "X jours restants" avant renouvellement
 * - Barre de progression visuelle (% du cycle écoulé)
 * - Avertissement si paiement en retard / annulé
 */
export function SubscriptionStatusCard({
  plan,
  status,
  currentPeriodEnd,
  hasSubscription,
}: SubscriptionStatusCardProps) {
  const planMeta = PLANS[plan];

  if (!hasSubscription || plan === "freemium") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4 text-[var(--text-muted)]" />
            Plan gratuit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            Tu utilises le plan freemium. Pas d&apos;échéance, pas de
            facturation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const daysRemaining = currentPeriodEnd
    ? Math.max(0, differenceInDays(currentPeriodEnd, now))
    : null;
  const hoursRemaining = currentPeriodEnd
    ? Math.max(0, differenceInHours(currentPeriodEnd, now))
    : null;

  // Calcul du % de cycle écoulé (sur 30 jours par défaut)
  const cycleDays = 30;
  const elapsedPct =
    daysRemaining !== null
      ? Math.min(100, ((cycleDays - daysRemaining) / cycleDays) * 100)
      : 0;

  const statusColor = status ? STATUS_COLORS[status] : null;
  const StatusIcon = statusColor?.icon ?? CheckCircle2;
  const statusLabel = status
    ? STATUS_LABELS[status] ?? status
    : "Actif";
  const isWarning = status === "past_due" || status === "unpaid" || status === "incomplete";
  const isCanceled = status === "canceled";

  return (
    <Card
      className={
        isWarning
          ? "border-[rgb(217,119,6)]/40 bg-[rgba(245,158,11,0.04)]"
          : isCanceled
            ? "border-[rgb(220,38,38)]/40 bg-[rgba(239,68,68,0.04)]"
            : undefined
      }
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{planMeta.name}</CardTitle>
              <PlanBadge plan={plan as UiPlan} />
            </div>
            {statusColor && (
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                }}
              >
                <StatusIcon className="size-3.5" />
                {statusLabel}
              </div>
            )}
          </div>
          {currentPeriodEnd && daysRemaining !== null && (
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums">
                {daysRemaining}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {daysRemaining > 1
                  ? "jours restants"
                  : daysRemaining === 1
                    ? "jour restant"
                    : hoursRemaining !== null && hoursRemaining > 0
                      ? `${hoursRemaining}h restantes`
                      : "Renouvellement aujourd'hui"}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de progression du cycle */}
        {daysRemaining !== null && (
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${elapsedPct}%`,
                  background: isWarning
                    ? "rgb(217, 119, 6)"
                    : isCanceled
                      ? "rgb(220, 38, 38)"
                      : "var(--accent)",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                Cycle : {Math.round(elapsedPct)}% écoulé
              </span>
              {currentPeriodEnd && (
                <span className="font-mono">
                  Renouvellement le{" "}
                  <strong className="text-[var(--text-primary)]">
                    {format(currentPeriodEnd, "d MMM yyyy", { locale: fr })}
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Avertissements selon status */}
        {isWarning && (
          <div className="flex gap-2 rounded-md border border-[rgb(217,119,6)]/30 bg-[rgba(245,158,11,0.08)] p-3 text-sm text-[rgb(146,64,14)]">
            <AlertTriangle className="size-4 shrink-0" />
            <p>
              <strong>Paiement en retard.</strong> Mets à jour ton moyen de
              paiement avant la prochaine échéance, sinon ton service sera
              suspendu automatiquement.
            </p>
          </div>
        )}
        {isCanceled && (
          <div className="flex gap-2 rounded-md border border-[rgb(220,38,38)]/30 bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[rgb(127,29,29)]">
            <XCircle className="size-4 shrink-0" />
            <p>
              <strong>Abonnement annulé.</strong> Ton service sera arrêté à la
              fin de la période en cours. Réactive un plan pour continuer.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
