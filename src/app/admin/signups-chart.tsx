"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  date: string;
  signups: number;
  restos: number;
}

export function SignupsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
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
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                signups: "Clients",
                restos: "Restaurants",
              };
              return [value as number, labels[String(name)] ?? String(name)];
            }}
          />
          <Line
            type="monotone"
            dataKey="signups"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--bg-primary)", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="restos"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
