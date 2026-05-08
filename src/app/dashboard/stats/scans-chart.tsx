"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  date: string;
  scans: number;
}

export function ScansChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="scans-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), "d MMM", { locale: fr })}
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border-subtle)" }}
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
            cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4" }}
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
            formatter={(value) => [value as number, "Scans"]}
          />
          <Area
            type="monotone"
            dataKey="scans"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#scans-gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
