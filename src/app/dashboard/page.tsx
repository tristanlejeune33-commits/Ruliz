import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ChartLine,
  ExternalLink,
  Gift,
  Globe2,
  Megaphone,
  MessageSquare,
  QrCode,
  ScanLine,
  ScanText,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
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
import { ScansChart } from "./stats/scans-chart";
import { KpiCard } from "./kpi-bento";
import { WelcomeHero, QuickActions } from "./welcome-hero";

export const metadata: Metadata = {
  title: "Dashboard · Ruliz",
};

export default async function DashboardHome() {
  const { session, restaurant } = await getCurrentRestaurant();
  const stats = await getRestaurantStats(restaurant.id, "30d");

  // Compteurs supplémentaires pour les KPI cards
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

  // Sparklines : on transforme perDay en array de counts pour le mini-chart
  const scansSparkline = stats.perDay.map((d) => d.scans);

  const quickActions = [
    {
      label: "Éditer ma carte",
      description: "Drag & drop catégories + produits",
      href: "/dashboard/menu",
      icon: UtensilsCrossed,
      accentColor: "oklch(0.65 0.22 25)",
    },
    {
      label: "Importer un menu",
      description: "Photo → carte digitale en 30s",
      href: "/dashboard/menu/import",
      icon: ScanText,
      accentColor: "oklch(0.7 0.18 145)",
    },
    {
      label: "Mes QR codes",
      description: "Génère et imprime tes codes",
      href: "/dashboard/qrcodes",
      icon: QrCode,
      accentColor: "oklch(0.6 0.25 280)",
    },
    {
      label: "Roulette d'avis",
      description: "Capte les coordonnées clients",
      href: "/dashboard/jeu",
      icon: Gift,
      accentColor: "#FF9B4A",
    },
    {
      label: "Pop-ups événement",
      description: "Annonce une promo en 1 clic",
      href: "/dashboard/popups",
      icon: Megaphone,
      accentColor: "oklch(0.65 0.2 320)",
    },
    {
      label: "SMS marketing",
      description: "Relance ta base clients",
      href: "/dashboard/sms",
      icon: MessageSquare,
      accentColor: "oklch(0.7 0.18 200)",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <WelcomeHero
        firstName={firstName}
        restaurantName={restaurant.nom}
        planBadge={<PlanBadge plan={restaurant.plan as Plan} />}
      />

      {/* KPI BENTO — 4 colonnes desktop */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Scans 30j"
          value={stats.scansThis}
          hint="vs 30 jours précédents"
          trendPct={stats.evolutionPct}
          icon={ScanLine}
          sparkline={scansSparkline}
          accentColor="oklch(0.7 0.18 145)"
          delay={0}
        />
        <KpiCard
          label="Clics produits"
          value={Number(totalClicks._sum.clicCount ?? 0)}
          hint="depuis le lancement"
          icon={Sparkles}
          accentColor="oklch(0.65 0.22 25)"
          delay={0.05}
        />
        <KpiCard
          label="Catégories · Produits"
          value={`${categoriesCount} · ${produitsCount}`}
          hint="dans ta carte"
          icon={UtensilsCrossed}
          accentColor="oklch(0.6 0.25 280)"
          delay={0.1}
        />
        <KpiCard
          label="Participations jeu"
          value={jeuParticipations}
          hint="leads captés"
          icon={Gift}
          accentColor="#FF9B4A"
          delay={0.15}
        />
      </div>

      {/* SCANS CHART : grand bloc horizontal */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-end justify-between gap-4 space-y-0">
          <div>
            <CardDescription className="text-xs uppercase tracking-wider">
              Activité 30 jours
            </CardDescription>
            <CardTitle className="mt-1 flex items-baseline gap-3 text-3xl tabular-nums">
              {stats.scansThis.toLocaleString("fr-FR")}
              <span className="text-sm font-normal text-[var(--text-muted)]">
                scans
              </span>
            </CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/stats">
              <ChartLine className="size-3.5" />
              Voir analytics
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
            <p className="text-xs text-[var(--text-muted)]">
              Les 6 trucs qu&apos;un restaurateur fait le plus.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/carte/${restaurant.id.toString()}`} target="_blank">
              <ExternalLink className="size-3.5" />
              Voir ma carte
            </Link>
          </Button>
        </div>
        <QuickActions actions={quickActions} />
      </div>

      {/* LANGUES CONSULTÉES */}
      {stats.langBreakdown.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div>
              <CardDescription className="text-xs uppercase tracking-wider">
                Langues consultées
              </CardDescription>
              <CardTitle className="mt-1 text-2xl">
                {stats.langBreakdown.length} langue
                {stats.langBreakdown.length > 1 ? "s" : ""}
              </CardTitle>
            </div>
            <Globe2 className="size-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.langBreakdown.map((l) => (
                <div
                  key={l.lang}
                  className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs"
                >
                  <span className="text-base leading-none">
                    {flagFor(l.lang)}
                  </span>
                  <span className="font-medium uppercase">{l.lang}</span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {l.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA BAS DE PAGE */}
      <Card className="bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-elevated)] to-[var(--bg-card)]">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Édite ta carte</CardTitle>
            <CardDescription className="mt-1">
              Drag & drop des catégories, modal d&apos;édition produit, preview
              live à droite. Auto-save activé sur les modifs.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/menu">
              Ouvrir l&apos;éditeur
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}

function flagFor(lang: string): string {
  const map: Record<string, string> = {
    fr: "🇫🇷",
    en: "🇬🇧",
    es: "🇪🇸",
    de: "🇩🇪",
    it: "🇮🇹",
    pt: "🇵🇹",
    zh: "🇨🇳",
  };
  return map[lang] ?? "🌐";
}
