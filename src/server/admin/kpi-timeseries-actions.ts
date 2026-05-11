"use server";

import { requireAdmin } from "@/lib/session";
import { getKpiTimeseries, type TimeseriesKpi } from "./stats";

export type { TimeseriesKpi };

/**
 * Server action publique pour fetch une série temporelle KPI.
 * Wrappe getKpiTimeseries avec une vérif admin.
 */
export async function fetchKpiTimeseries(
  kpi: TimeseriesKpi,
  days: number,
): Promise<Array<{ date: string; value: number }>> {
  await requireAdmin();
  return getKpiTimeseries(kpi, days);
}
