"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  Globe2,
  Megaphone,
  MessageSquare,
  Minus,
  QrCode,
  ScanLine,
  ScanText,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Mapping iconKey → Lucide component.
 *
 * On utilise des STRINGS au lieu de passer des refs Lucide depuis les
 * Server Components, parce que les forwardRef Lucide ne sont pas
 * serializable across la frontière RSC.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  scan: ScanLine,
  sparkles: Sparkles,
  utensils: UtensilsCrossed,
  gift: Gift,
  globe: Globe2,
  qrcode: QrCode,
  scanText: ScanText,
  megaphone: Megaphone,
  message: MessageSquare,
};

export type KpiIconKey = keyof typeof ICON_MAP;

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trendPct?: number | null;
  iconKey: KpiIconKey;
  sparkline?: number[];
  accentColor?: string;
  delay?: number;
  formatter?: (v: string | number) => string;
}

export function KpiCard({
  label,
  value,
  hint,
  trendPct,
  iconKey,
  sparkline,
  accentColor = "var(--accent)",
  delay = 0,
  formatter,
}: KpiCardProps) {
  const Icon = ICON_MAP[iconKey] ?? ScanLine;
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
      <Card className="group relative overflow-hidden p-5 transition-all hover:border-[var(--text-muted)]">
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
            {hint && <span className="text-[var(--text-muted)]">{hint}</span>}
          </div>
        )}

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
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const gradId = `spark-${accentColor.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      className="relative mt-3 h-6 w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
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
