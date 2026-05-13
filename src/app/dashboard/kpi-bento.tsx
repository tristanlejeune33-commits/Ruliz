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
export type KpiTone = "cyan" | "violet" | "success" | "danger";

const TONE_STYLES: Record<
  KpiTone,
  { iconBg: string; iconText: string; sparkColor: string; glow: string; ring: string }
> = {
  cyan: {
    iconBg: "bg-[var(--neon-cyan-soft)]",
    iconText: "text-[var(--neon-cyan)]",
    sparkColor: "#00E5FF",
    glow: "group-hover:shadow-[0_0_28px_rgba(0,229,255,0.18)]",
    ring: "ring-[var(--neon-cyan)]/25",
  },
  violet: {
    iconBg: "bg-[var(--neon-violet-soft)]",
    iconText: "text-[var(--neon-violet)]",
    sparkColor: "#B16CFF",
    glow: "group-hover:shadow-[0_0_28px_rgba(177,108,255,0.18)]",
    ring: "ring-[var(--neon-violet)]/25",
  },
  success: {
    iconBg: "bg-[var(--neon-success-soft)]",
    iconText: "text-[var(--neon-success)]",
    sparkColor: "#00FFA3",
    glow: "group-hover:shadow-[0_0_28px_rgba(0,255,163,0.16)]",
    ring: "ring-[var(--neon-success)]/25",
  },
  danger: {
    iconBg: "bg-[var(--neon-danger-soft)]",
    iconText: "text-[var(--neon-danger)]",
    sparkColor: "#FF3D71",
    glow: "group-hover:shadow-[0_0_28px_rgba(255,61,113,0.16)]",
    ring: "ring-[var(--neon-danger)]/25",
  },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trendPct?: number | null;
  iconKey: KpiIconKey;
  sparkline?: number[];
  /** Variante de couleur strictement DS Ruliz (cyan/violet/success/danger). */
  tone?: KpiTone;
  delay?: number;
  formatter?: (v: string | number) => string;
  /**
   * Active la marque de coin diagonale en haut-droite (innovation #10 du DS
   * light). N'a aucun effet visible en dark la classe est inerte côté CSS
   * tant que data-theme≠"light". Réservée aux KPIs principaux pour signer
   * le détail tech sans en faire un motif.
   */
  coinMarker?: boolean;
}

export function KpiCard({
  label,
  value,
  hint,
  trendPct,
  iconKey,
  sparkline,
  tone = "cyan",
  delay = 0,
  formatter,
  coinMarker = false,
}: KpiCardProps) {
  const Icon = ICON_MAP[iconKey] ?? ScanLine;
  const t = TONE_STYLES[tone];
  const formattedValue = formatter
    ? formatter(value)
    : typeof value === "number"
      ? value.toLocaleString("fr-FR")
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden p-5 transition-all duration-300",
          t.glow,
          coinMarker && "card-coin-marker",
        )}
      >
        {/* Glow décoratif au hover */}
        <div
          className="absolute -right-10 -top-10 size-32 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-30"
          style={{
            background: `radial-gradient(circle, ${t.sparkColor}30 0%, transparent 70%)`,
          }}
          aria-hidden
        />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
              {formattedValue}
            </p>
          </div>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg ring-1 transition-colors duration-200",
              t.iconBg,
              t.iconText,
              t.ring,
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </div>
        </div>

        {(trendPct !== undefined || hint) && (
          <div className="relative mt-3 flex items-center gap-2 text-xs">
            {trendPct !== undefined && trendPct !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono font-semibold",
                  trendPct > 0
                    ? "bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                    : trendPct < 0
                      ? "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]"
                      : "bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                )}
              >
                {trendPct > 0 ? (
                  <ArrowUpRight className="size-3" strokeWidth={2} />
                ) : trendPct < 0 ? (
                  <ArrowDownRight className="size-3" strokeWidth={2} />
                ) : (
                  <Minus className="size-3" strokeWidth={2} />
                )}
                {Math.abs(trendPct)}%
              </span>
            )}
            {hint && <span className="text-[var(--text-tertiary)]">{hint}</span>}
          </div>
        )}

        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} accentColor={t.sparkColor} />
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
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
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
