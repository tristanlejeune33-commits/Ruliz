import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">
            <Gauge className="size-3" /> Analyse
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {restaurant.nom}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Comportement de tes clients sur les {analytics.range.days} derniers jours.
          </p>
        </div>
      </header>

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
