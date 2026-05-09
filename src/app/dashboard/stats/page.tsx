import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import {
  getAnalytics,
  type AnalyticsFilters,
  type AnalyticsPeriod,
} from "@/server/dashboard/analytics";
import type { Device, OS } from "@/lib/user-agent";
import { FiltersBar } from "./filters-bar";
import { KpiCards } from "./kpi-cards";
import { TimeSeriesCard } from "./time-series-card";
import { HourlyHeatmap } from "./hourly-heatmap";
import { DonutCard } from "./donut-card";
import { CountriesCard } from "./countries-card";
import { TopQrcodesCard } from "./top-qrcodes-card";
import { TopProduitsCard } from "./top-produits-card";
import { LiveFeed } from "./live-feed";
import { InsightsCards } from "./insights-cards";

export const metadata: Metadata = {
  title: "Analyse · Ruliz",
};

interface PageProps {
  searchParams: Promise<{
    period?: string;
    start?: string;
    end?: string;
    device?: string;
    os?: string;
    country?: string;
    lang?: string;
  }>;
}

const VALID_PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "365d", "custom"];

export default async function StatsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const period: AnalyticsPeriod = (VALID_PERIODS as string[]).includes(
    params.period ?? "",
  )
    ? (params.period as AnalyticsPeriod)
    : "30d";

  const filters: AnalyticsFilters = {
    period,
    customStart: params.start,
    customEnd: params.end,
    device: (params.device as Device | "all") ?? "all",
    os: (params.os as OS | "all") ?? "all",
    country: params.country ?? "all",
    lang: params.lang ?? "all",
  };

  const { restaurant } = await getCurrentRestaurant();
  const analytics = await getAnalytics(restaurant.id, filters);

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Gauge className="size-3" strokeWidth={1.75} />}>
            Analyse
          </HeroEyebrow>
        }
        title={restaurant.nom}
        description={`Comportement de tes clients sur les ${analytics.range.days} derniers jours.`}
      />

      <FiltersBar
        currentFilters={filters}
        availableCountries={analytics.countries.map((c) => ({
          code: c.code,
          name: c.name,
          flag: c.flag,
        }))}
        availableLangs={analytics.langs.map((l) => l.lang)}
      />

      <KpiCards kpis={analytics.kpis} />

      {analytics.insights.length > 0 && <InsightsCards insights={analytics.insights} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <TimeSeriesCard data={analytics.perDay} className="lg:col-span-2" />
        <CountriesCard countries={analytics.countries} />
      </div>

      <HourlyHeatmap data={analytics.perHourDay} />

      <div className="grid gap-4 md:grid-cols-3">
        <DonutCard
          title="Appareils"
          data={analytics.devices.map((d) => ({ key: d.key, label: d.label, count: d.count }))}
        />
        <DonutCard
          title="Navigateurs"
          data={analytics.browsers.map((b) => ({ key: b.key, label: b.label, count: b.count }))}
        />
        <DonutCard
          title="Systèmes"
          data={analytics.oses.map((o) => ({ key: o.key, label: o.label, count: o.count }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopQrcodesCard items={analytics.topQrcodes} />
        <LiveFeed initialItems={analytics.liveFeed} />
      </div>

      <div className="grid gap-4">
        <TopProduitsCard restaurantId={restaurant.id} limit={10} />
      </div>
    </div>
  );
}
