import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChartLine, ExternalLink, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { getRestaurantStats } from "@/server/dashboard/stats";
import { FlagIcon } from "@/components/shared/flag-icon";
import { isSupportedLang } from "@/lib/langs";
import { ScansChart } from "./stats/scans-chart";
import { KpiCard } from "./kpi-bento";
import { WelcomeHero, QuickActions } from "./welcome-hero";
import { DashboardMobileWrap } from "./dashboard-mobile-wrap";

export const metadata: Metadata = {
  title: "Dashboard Ruliz",
};

const LANG_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  zh: "中文",
};

export default async function DashboardHome() {
  const { session, restaurant } = await getCurrentRestaurant();
  const stats = await getRestaurantStats(restaurant.id, "30d");

  const [categoriesCount, produitsCount, totalClicks, jeuParticipations] =
    await Promise.all([
      prisma.categorie.count({
        where: { restaurantId: restaurant.id, parentId: null },
      }),
      prisma.produit.count({
        where: { categorie: { restaurantId: restaurant.id } },
      }),
      prisma.produit.aggregate({
        where: { categorie: { restaurantId: restaurant.id } },
        _sum: { clicCount: true },
      }),
      prisma.jeuParticipation.count({
        where: { jeu: { restaurantId: restaurant.id } },
      }),
    ]);

  const firstName = session.user.name?.split(" ")[0] ?? "";
  const scansSparkline = stats.perDay.map((d) => d.scans);

  // Quick actions DS palette stricte (cyan/violet/success/danger)
  const quickActions = [
    {
      label: "Éditer ma carte",
      description: "Glisse-dépose catégories et plats",
      href: "/dashboard/menu",
      iconKey: "utensils" as const,
      tone: "cyan" as const,
    },
    {
      label: "Importer un menu",
      description: "Photo → carte digitale en 30s",
      href: "/dashboard/menu/import",
      iconKey: "scanText" as const,
      tone: "success" as const,
    },
    {
      label: "Mes QR codes",
      description: "Génère et imprime tes codes",
      href: "/dashboard/qrcodes",
      iconKey: "qrcode" as const,
      tone: "violet" as const,
    },
    {
      label: "Roulette d'avis",
      description: "Récupère les contacts de tes clients",
      href: "/dashboard/jeu",
      iconKey: "gift" as const,
      tone: "violet" as const,
    },
    {
      label: "Pop-ups événement",
      description: "Annonce une promo en 1 clic",
      href: "/dashboard/popups",
      iconKey: "megaphone" as const,
      tone: "cyan" as const,
    },
    {
      label: "SMS marketing",
      description: "Relance tes clients",
      href: "/dashboard/sms",
      iconKey: "message" as const,
      tone: "cyan" as const,
    },
  ];

  return (
    <DashboardMobileWrap publicMenuUrl={`/carte/${restaurant.id.toString()}`}>
    <div className="space-y-6 md:space-y-8">
      <WelcomeHero
        firstName={firstName}
        restaurantName={restaurant.nom}
        planBadge={<PlanBadge plan={restaurant.plan as Plan} />}
      />

      {/* KPI BENTO innovation #10 light : marque de coin diagonale bleue
          en haut-droite des 4 KPIs principaux (inerte en dark) */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Scans 30j"
          value={stats.scansThis}
          hint="vs 30 jours précédents"
          trendPct={stats.evolutionPct}
          iconKey="scan"
          sparkline={scansSparkline}
          tone="cyan"
          delay={0}
          coinMarker
        />
        <KpiCard
          label="Clics produits"
          value={Number(totalClicks._sum.clicCount ?? 0)}
          hint="depuis le lancement"
          iconKey="sparkles"
          tone="success"
          delay={0.04}
          coinMarker
        />
        <KpiCard
          label="Catégories Produits"
          value={`${categoriesCount} ${produitsCount}`}
          hint="dans ta carte"
          iconKey="utensils"
          tone="violet"
          delay={0.08}
          coinMarker
        />
        <KpiCard
          label="Participations jeu"
          value={jeuParticipations}
          hint="contacts récupérés"
          iconKey="gift"
          tone="violet"
          delay={0.12}
          coinMarker
        />
      </div>

      {/* SCANS CHART */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-end justify-between gap-4 space-y-0">
          <div>
            <CardDescription className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Activité 30 jours
            </CardDescription>
            <CardTitle className="mt-1 flex items-baseline gap-3 text-3xl tabular-nums">
              {stats.scansThis.toLocaleString("fr-FR")}
              <span className="text-sm font-normal text-[var(--text-tertiary)]">
                scans
              </span>
            </CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/stats">
              <ChartLine className="size-3.5" strokeWidth={1.75} />
              Voir les statistiques
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ScansChart data={stats.perDay} />
        </CardContent>
      </Card>

      {/* QUICK ACTIONS */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Actions rapides
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Les 6 actions les plus fréquentes pour un restaurateur.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/carte/${restaurant.id.toString()}`}
              target="_blank"
              prefetch={false}
            >
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
              Voir ma carte
            </Link>
          </Button>
        </div>
        <QuickActions actions={quickActions} />
      </div>

      {/* LANGUES CONSULTÉES pas d'emoji, code langue mono */}
      {stats.langBreakdown.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div>
              <CardDescription className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Langues consultées
              </CardDescription>
              <CardTitle className="mt-1 text-2xl">
                {stats.langBreakdown.length} langue
                {stats.langBreakdown.length > 1 ? "s" : ""}
              </CardTitle>
            </div>
            <Globe2
              className="size-4 text-[var(--text-tertiary)]"
              strokeWidth={1.75}
            />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.langBreakdown.map((l) => (
                <div
                  key={l.lang}
                  className="flex items-center gap-2 rounded-full border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 py-1.5 text-xs"
                >
                  {isSupportedLang(l.lang) && (
                    <FlagIcon lang={l.lang} width={18} rounded />
                  )}
                  <span className="font-medium text-[var(--text-secondary)]">
                    {LANG_LABELS[l.lang] ?? l.lang}
                  </span>
                  <span className="font-mono text-[var(--text-tertiary)]">
                    {l.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA bas de page */}
      <Card className="relative overflow-hidden lift-hover">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--neon-cyan)]/15 blur-3xl"
        />
        <CardHeader className="relative flex flex-col items-start gap-4 space-y-0 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Édite ta carte</CardTitle>
            <CardDescription className="mt-1">
              Glisse-dépose tes catégories, modifie tes plats, aperçu en direct
              à droite. Tes modifications sont sauvegardées toutes seules.
            </CardDescription>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link href="/dashboard/menu">
              Ouvrir l&apos;éditeur
              <ArrowUpRight className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
    </DashboardMobileWrap>
  );
}
