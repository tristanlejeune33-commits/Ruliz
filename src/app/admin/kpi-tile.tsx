"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchKpiTimeseries,
  type TimeseriesKpi,
} from "@/server/admin/kpi-timeseries-actions";

interface KpiTileProps {
  label: string;
  value: string;
  helper: string;
  /** JSX pré-rendu de l'icône (Server → Client : les fonctions Lucide ne
      sont pas sérialisables, donc on passe l'élément React déjà construit) */
  iconNode: React.ReactNode;
  /** Si défini : tile cliquable → ouvre une modal avec graphique 3 ans */
  kpi?: TimeseriesKpi;
  /** Si true → format euros sur l'axe Y de la modal (sinon nombres bruts) */
  isMoney?: boolean;
}

const RANGE_OPTIONS = [
  { label: "30 jours", days: 30 },
  { label: "6 mois", days: 180 },
  { label: "1 an", days: 365 },
  { label: "3 ans", days: 1100 },
];

export function KpiTile({
  label,
  value,
  helper,
  iconNode,
  kpi,
  isMoney,
}: KpiTileProps) {
  const clickable = !!kpi;

  const tile = (
    <Card
      className={
        clickable
          ? "lift-hover cursor-pointer transition-all hover:border-[var(--accent)]/40"
          : ""
      }
    >
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <span className="text-[var(--text-muted)]">{iconNode}</span>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>
        {clickable && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--accent)]/70">
            Clic pour le graphique →
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!clickable) return tile;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div role="button" tabIndex={0}>
          {tile}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <KpiChartModal label={label} kpi={kpi!} isMoney={isMoney} />
      </DialogContent>
    </Dialog>
  );
}

function KpiChartModal({
  label,
  kpi,
  isMoney,
}: {
  label: string;
  kpi: TimeseriesKpi;
  isMoney?: boolean;
}) {
  const [days, setDays] = useState(365);
  const [data, setData] = useState<Array<{ date: string; value: number }>>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const rows = await fetchKpiTimeseries(kpi, days);
      setData(rows);
    });
  }, [kpi, days]);

  // Pour les revenus on convertit centimes → euros
  const displayData = data.map((d) => ({
    date: d.date,
    value: isMoney ? d.value / 100 : d.value,
  }));

  const total = displayData.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription>
          Évolution temporelle. Survole le graphique pour voir les valeurs
          détaillées.
        </DialogDescription>
      </DialogHeader>

      {/* Toggle range */}
      <div className="flex flex-wrap gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => setDays(opt.days)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              days === opt.days
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stat totale sur la période */}
      <div className="flex items-baseline gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3">
        <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          Total sur la période :
        </span>
        <span className="font-mono text-xl font-bold tabular-nums text-[var(--text-primary)]">
          {isMoney
            ? total.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              })
            : Math.round(total).toLocaleString("fr-FR")}
        </span>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        {pending ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Aucune donnée pour cette période.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={displayData}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-kpi" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--accent)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--accent)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => {
                  try {
                    return days > 365
                      ? format(parseISO(d), "MMM yy", { locale: fr })
                      : days > 60
                        ? format(parseISO(d), "d MMM", { locale: fr })
                        : format(parseISO(d), "d/MM", { locale: fr });
                  } catch {
                    return d;
                  }
                }}
                stroke="var(--text-muted)"
                fontSize={11}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  isMoney
                    ? `${(v / 1000).toFixed(0)}k€`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(1)}k`
                      : v.toString()
                }
                stroke="var(--text-muted)"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-popover-solid, var(--bg-elevated))",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => {
                  const num = typeof v === "number" ? v : Number(v);
                  return [
                    isMoney
                      ? num.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        })
                      : num.toLocaleString("fr-FR"),
                    label,
                  ];
                }}
                labelFormatter={(d) => {
                  try {
                    return format(parseISO(String(d)), "EEEE d MMM yyyy", {
                      locale: fr,
                    });
                  } catch {
                    return String(d);
                  }
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#grad-kpi)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
