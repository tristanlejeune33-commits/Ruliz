import type { Metadata } from "next";
import { Building2, Euro, ScanLine, Users } from "lucide-react";
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

  const cards = [
    {
      label: "MRR",
      value: formatEuro(kpis.mrr),
      helper: "Hors taxes, basé sur les plans actifs",
      icon: Euro,
    },
    {
      label: "Clients actifs",
      value: formatNumber(kpis.activeClients),
      helper: "Statut « actif »",
      icon: Users,
    },
    {
      label: "Restaurants",
      value: formatNumber(kpis.totalRestaurants),
      helper: "Tous plans confondus",
      icon: Building2,
    },
    {
      label: "Scans 30j",
      value: formatNumber(kpis.scans30d),
      helper: `${formatNumber(kpis.scansAllTime)} cumulés`,
      icon: ScanLine,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
              <CardDescription>{c.label}</CardDescription>
              <c.icon className="size-4 text-[var(--text-muted)]" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl tabular-nums">{c.value}</CardTitle>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{c.helper}</p>
            </CardContent>
          </Card>
        ))}
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
