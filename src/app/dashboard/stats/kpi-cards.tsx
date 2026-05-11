"use client";

import { ArrowDownRight, ArrowUpRight, Clock, Eye, ScanLine, Sparkles, TrendingUp, UserCheck, UserPlus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsResult } from "@/server/dashboard/analytics";

interface KpiCardsProps {
  kpis: AnalyticsResult["kpis"];
}

const DAY_LABELS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi
        label="Scans totaux"
        value={kpis.totalScans}
        evolution={kpis.totalScansEvol}
        icon={ScanLine}
      />
      <Kpi
        label="Visiteurs uniques"
        value={kpis.uniqueScans}
        evolution={kpis.uniqueScansEvol}
        helper="estimation par appareil"
        icon={Users}
      />
      <Kpi
        label="Nouveaux"
        value={kpis.newUsers}
        helper="jamais vus avant"
        icon={UserPlus}
      />
      <Kpi
        label="Récurrents"
        value={kpis.returningUsers}
        helper="vus sur la période précédente"
        icon={UserCheck}
      />
      <Kpi
        label="Visiteurs du jour"
        value={kpis.dau}
        helper="aujourd'hui"
        icon={Eye}
      />
      <Kpi label="Visiteurs / semaine" value={kpis.wau} helper="7 derniers jours" icon={Eye} />
      <Kpi
        label="Visiteurs / mois"
        value={kpis.mau}
        helper="30 derniers jours"
        icon={TrendingUp}
      />
      <Kpi
        label="Scans / visiteur"
        value={kpis.avgScansPerUser}
        decimal
        helper={`pic ${String(kpis.busiestHour).padStart(2, "0")}h · ${DAY_LABELS[kpis.busiestDayOfWeek] ?? "?"}`}
        icon={Clock}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  evolution,
  helper,
  icon: Icon,
  decimal,
}: {
  label: string;
  value: number;
  evolution?: number | null;
  helper?: string;
  icon: typeof Sparkles;
  decimal?: boolean;
}) {
  const positive = evolution !== null && evolution !== undefined && evolution >= 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <Icon className="size-3.5 text-[var(--text-muted)]" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl tabular-nums">
          {decimal ? value.toFixed(1) : value.toLocaleString("fr-FR")}
        </CardTitle>
        <div className="mt-1.5 flex items-center gap-2">
          {evolution !== null && evolution !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded text-[10px] font-medium tabular-nums",
                positive
                  ? "text-[var(--neon-success)]"
                  : "text-[var(--neon-danger)]",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {evolution > 0 ? "+" : ""}
              {evolution}%
            </span>
          )}
          {helper && (
            <span className="text-[10px] text-[var(--text-muted)]">{helper}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
