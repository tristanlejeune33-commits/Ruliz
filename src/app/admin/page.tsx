import type { Metadata } from "next";
import {
  Activity,
  Building2,
  Eye,
  Euro,
  ScanLine,
  Sparkles,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminKpis, getSignupTimeseries } from "@/server/admin/stats";
import { SignupsChart } from "./signups-chart";

export const metadata: Metadata = {
  title: "Admin · Ruliz",
};

const formatEuro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const formatNumber = (n: number) => n.toLocaleString("fr-FR");

export default async function AdminHome() {
  const [kpis, timeseries] = await Promise.all([
    getAdminKpis(),
    getSignupTimeseries(),
  ]);

  // KPIs business (en haut) — finance + base utilisateurs
  const businessCards = [
    {
      label: "MRR",
      value: formatEuro(kpis.mrr),
      helper: "Hors taxes, basé sur les plans actifs",
      icon: Euro,
    },
    {
      label: "Clients actifs",
      value: formatNumber(kpis.activeClients),
      helper: `${formatNumber(kpis.newClients7d)} nouveaux 7j`,
      icon: Users,
    },
    {
      label: "Restaurants",
      value: formatNumber(kpis.totalRestaurants),
      helper: "Tous plans confondus",
      icon: Building2,
    },
    {
      label: "Restos actifs 24h",
      value: formatNumber(kpis.activeRestos24h),
      helper: "Au moins 1 scan dans les 24h",
      icon: Sparkles,
    },
  ];

  // KPIs trafic (audience / utilisation produit) — scans + visiteurs uniques
  const trafficCards = [
    {
      label: "Scans 24h",
      value: formatNumber(kpis.scans24h),
      helper: "Aujourd'hui",
      icon: Activity,
    },
    {
      label: "Scans 7j",
      value: formatNumber(kpis.scans7d),
      helper: `${formatNumber(kpis.uniqueVisitors7d)} visiteurs uniques`,
      icon: TrendingUp,
    },
    {
      label: "Scans 30j",
      value: formatNumber(kpis.scans30d),
      helper: `${formatNumber(kpis.uniqueVisitors30d)} visiteurs uniques`,
      icon: ScanLine,
    },
    {
      label: "Impressions",
      value: formatNumber(kpis.impressions),
      helper: "Total cumulé depuis le lancement",
      icon: Eye,
    },
  ];


  return (
    <div className="space-y-8">
      <div>
        <Badge variant="secondary">Backoffice</Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Indicateurs Ruliz — branchés sur la DB live.
        </p>
      </div>

      {/* === BUSINESS — finance + base utilisateurs === */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          Business
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {businessCards.map((c) => (
            <KpiTile
              key={c.label}
              label={c.label}
              value={c.value}
              helper={c.helper}
              Icon={c.icon}
            />
          ))}
        </div>
      </div>

      {/* === TRAFIC — utilisation produit (scans + visiteurs uniques) === */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          Trafic carte publique
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {trafficCards.map((c) => (
            <KpiTile
              key={c.label}
              label={c.label}
              value={c.value}
              helper={c.helper}
              Icon={c.icon}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptions sur 30 jours</CardTitle>
          <CardDescription>
            Nouveaux clients (bleu) et nouveaux restaurants (gris).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupsChart data={timeseries} />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  label,
  value,
  helper,
  Icon,
}: {
  label: string;
  value: string;
  helper: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-[var(--text-muted)]" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>
      </CardContent>
    </Card>
  );
}
