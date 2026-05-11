import type { Metadata } from "next";
import {
  Activity,
  Building2,
  Coins,
  Eye,
  Euro,
  ScanLine,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
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
import { KpiTile } from "./kpi-tile";
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
  // Chaque KPI avec `kpi:` est cliquable → ouvre modal graphique 3 ans
  const businessCards = [
    {
      label: "Revenu mensuel récurrent",
      value: formatEuro(kpis.mrr),
      helper: "Hors taxes, basé sur les plans actifs",
      icon: Euro,
      kpi: "mrr" as const,
      isMoney: true,
    },
    {
      label: "Revenus Boutique",
      value: formatEuro(kpis.revenueBoutiqueCentimes / 100),
      helper: "Cumulé · sets de table, stickers, QR pré-imprimés",
      icon: ShoppingBag,
      kpi: "revenueBoutique" as const,
      isMoney: true,
    },
    {
      label: "Revenus SMS",
      value: formatEuro(kpis.revenueSmsCentimes / 100),
      helper: "Cumulé · packs SMS vendus aux restaurateurs",
      icon: Coins,
      kpi: "revenueSms" as const,
      isMoney: true,
    },
    {
      label: "Clients actifs",
      value: formatNumber(kpis.activeClients),
      helper: `${formatNumber(kpis.newClients7d)} nouveaux 7j`,
      icon: Users,
      kpi: "signups" as const,
    },
    {
      label: "Restaurants",
      value: formatNumber(kpis.totalRestaurants),
      helper: "Tous plans confondus",
      icon: Building2,
      kpi: "restaurants" as const,
    },
    {
      label: "Restos actifs 24h",
      value: formatNumber(kpis.activeRestos24h),
      helper: "Au moins 1 scan dans les 24h",
      icon: Sparkles,
      kpi: "activeRestos" as const,
    },
  ];

  // KPIs trafic (audience / utilisation produit) — scans + visiteurs uniques
  const trafficCards = [
    {
      label: "Scans 24h",
      value: formatNumber(kpis.scans24h),
      helper: "Aujourd'hui",
      icon: Activity,
      kpi: "scans" as const,
    },
    {
      label: "Scans 7j",
      value: formatNumber(kpis.scans7d),
      helper: `${formatNumber(kpis.uniqueVisitors7d)} visiteurs uniques`,
      icon: TrendingUp,
      kpi: "scans" as const,
    },
    {
      label: "Visiteurs uniques",
      value: formatNumber(kpis.uniqueVisitors30d),
      helper: "Sur les 30 derniers jours",
      icon: Eye,
      kpi: "uniqueVisitors" as const,
    },
    {
      label: "Impressions",
      value: formatNumber(kpis.impressions),
      helper: "Total cumulé depuis le lancement",
      icon: ScanLine,
      kpi: "impressions" as const,
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
              iconNode={<c.icon className="size-4" />}
              kpi={"kpi" in c ? c.kpi : undefined}
              isMoney={
                "isMoney" in c && typeof c.isMoney === "boolean"
                  ? c.isMoney
                  : undefined
              }
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
              iconNode={<c.icon className="size-4" />}
              kpi={"kpi" in c ? c.kpi : undefined}
              isMoney={
                "isMoney" in c && typeof c.isMoney === "boolean"
                  ? c.isMoney
                  : undefined
              }
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

// KpiTile (cliquable + modal graphique 3 ans) déplacé dans ./kpi-tile.tsx
// pour pouvoir être un Client Component avec Dialog Radix.
