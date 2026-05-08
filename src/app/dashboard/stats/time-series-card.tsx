"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
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
import { cn } from "@/lib/utils";

interface TimeSeriesCardProps {
  data: Array<{ date: string; scans: number; previous: number }>;
  className?: string;
}

export function TimeSeriesCard({ data, className }: TimeSeriesCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>Évolution des scans</CardTitle>
        <CardDescription>
          Comparaison période actuelle vs précédente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ts-current" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) =>
                  format(parseISO(d), "d MMM", { locale: fr })
                }
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "var(--border-subtle)" }}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "var(--border-subtle)" }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--accent)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelFormatter={(d) =>
                  typeof d === "string"
                    ? format(parseISO(d), "EEEE d MMM", { locale: fr })
                    : ""
                }
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    scans: "Période actuelle",
                    previous: "Période précédente",
                  };
                  return [value as number, labels[String(name)] ?? String(name)];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                formatter={(value) =>
                  value === "scans" ? "Période actuelle" : "Période précédente"
                }
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#ts-current)"
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
