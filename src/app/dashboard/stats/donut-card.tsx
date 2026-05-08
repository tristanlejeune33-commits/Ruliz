"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DonutCardProps {
  title: string;
  data: Array<{ key: string; label: string; count: number }>;
}

const COLORS = [
  "var(--accent)",
  "oklch(0.7 0.18 145)",
  "oklch(0.65 0.22 25)",
  "oklch(0.65 0.22 310)",
  "oklch(0.7 0.18 70)",
  "oklch(0.65 0.18 200)",
  "oklch(0.55 0.1 270)",
];

export function DonutCard({ title, data }: DonutCardProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const top = data.slice(0, 6);
  const rest = data.slice(6);
  const merged = rest.length
    ? [
        ...top,
        {
          key: "_other",
          label: `Autres (${rest.length})`,
          count: rest.reduce((acc, d) => acc + d.count, 0),
        },
      ]
    : top;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">
            Pas de données.
          </p>
        ) : (
          <>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={merged}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {merged.map((d, i) => (
                      <Cell key={d.key} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                    formatter={(value) => [value as number, "Scans"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5">
              {merged.map((d, i) => {
                const pct = Math.round((d.count / total) * 100);
                return (
                  <li
                    key={d.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-[var(--text-secondary)]">
                      {d.label}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--text-muted)]">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
