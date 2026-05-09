"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * KPI Card avec animation d'entrée stagger + trend indicator + sparkline.
 * Utilisé sur le dashboard home pour donner un visuel "tech" pro.
 */
interface KpiCardProps {
  label: string;
  value: string | number;
  /** Sous-texte (ex: "vs 30 derniers jours") */
  hint?: string;
  /** Tendance en % (positif = vert, négatif = rouge, 0 = neutre) */
  trendPct?: number | null;
  icon: LucideIcon;
  /** Sparkline data (tableau de nombres normalisés 0-1) */
  sparkline?: number[];
  /** Couleur d'accent (CSS color) */
  accentColor?: string;
  /** Animation delay pour stagger */
  delay?: number;
  /** Format custom de la valeur */
  formatter?: (v: string | number) => string;
}

export function KpiCard({
  label,
  value,
  hint,
  trendPct,
  icon: Icon,
  sparkline,
  accentColor = "var(--accent)",
  delay = 0,
  formatter,
}: KpiCardProps) {
  const formattedValue = formatter
    ? formatter(value)
    : typeof value === "number"
      ? value.toLocaleString("fr-FR")
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="group relative overflow-hidden p-5 transition-all hover:border-[var(--border-subtle-hover,var(--text-muted))]">
        {/* Background glow that follows accent — subtle */}
        <div
          className="absolute -right-10 -top-10 size-32 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-20"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          }}
          aria-hidden
        />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
              {formattedValue}
            </p>
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-lg transition-colors duration-200"
            style={{ background: `${accentColor}15` }}
          >
            <Icon className="size-4" style={{ color: accentColor }} />
          </div>
        </div>

        {/* Trend indicator + hint */}
        {(trendPct !== undefined || hint) && (
          <div className="relative mt-3 flex items-center gap-2 text-xs">
            {trendPct !== undefined && trendPct !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono font-semibold",
                  trendPct > 0
                    ? "bg-[oklch(0.7_0.18_145)]/15 text-[oklch(0.7_0.18_145)]"
                    : trendPct < 0
                      ? "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
                )}
              >
                {trendPct > 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : trendPct < 0 ? (
                  <ArrowDownRight className="size-3" />
                ) : (
                  <Minus className="size-3" />
                )}
                {Math.abs(trendPct)}%
              </span>
            )}
            {hint && (
              <span className="text-[var(--text-muted)]">{hint}</span>
            )}
          </div>
        )}

        {/* Sparkline mini-chart */}
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} accentColor={accentColor} />
        )}
      </Card>
    </motion.div>
  );
}

function Sparkline({
  data,
  accentColor,
}: {
  data: number[];
  accentColor: string;
}) {
  // Normalise sur [0, 1] via min-max
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  // Construit le path d'aire (sous la courbe) pour effet rempli
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      className="relative mt-3 h-6 w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${accentColor.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-${accentColor.replace(/[^a-z0-9]/gi, "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
