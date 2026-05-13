"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import {
  ArrowUpRight,
  Gift,
  Megaphone,
  MessageSquare,
  QrCode,
  ScanLine,
  ScanText,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

const QUICK_ACTION_ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  scanText: ScanText,
  qrcode: QrCode,
  gift: Gift,
  megaphone: Megaphone,
  message: MessageSquare,
  scan: ScanLine,
  sparkles: Sparkles,
};

export type QuickActionIconKey = keyof typeof QUICK_ACTION_ICONS;

/** Variantes de couleur d'accent · strictement DS Ruliz (palette néon). */
export type QuickActionTone = "cyan" | "violet" | "success" | "danger";

interface WelcomeHeroProps {
  firstName: string;
  restaurantName: string;
  /** Plan badge à afficher dans la zone droite (slot KPI) */
  planBadge?: React.ReactNode;
}

/**
 * Hero status premium (DS Ruliz) · pas de "Welcome back 👋" mou.
 * - Status chip "Carte en ligne" avec dot vert pulsant
 * - Titre = nom du restaurant (display large)
 * - Sous-titre direct : "Vue d'ensemble · {date}"
 * - Glow ambient cyan en haut-gauche, violet en bas-droite
 */
export function WelcomeHero({
  firstName,
  restaurantName,
  planBadge,
}: WelcomeHeroProps) {
  const [now, setNow] = useState<Date | null>(null);
  const { t, lang } = usePanelLang();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Locale pour le format de date · mappe la lang panel sur un BCP-47
  const localeMap: Record<string, string> = {
    fr: "fr-FR",
    en: "en-GB",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    zh: "zh-CN",
  };
  const locale = localeMap[lang] ?? "fr-FR";

  // Hint discret avec date + heure si on a chargé côté client
  const dateStr = now
    ? now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="relative isolate overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-5 backdrop-blur-2xl md:p-6 lg:p-8"
    >
      {/* Glows ambiants néon */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-[var(--neon-cyan)]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-[var(--neon-violet)]/10 blur-3xl"
      />
      {/* Grille décorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill />
            {planBadge}
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
            {restaurantName}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span>{t("home.overview")}</span>
            {firstName && (
              <>
                <span aria-hidden className="text-[var(--text-tertiary)]">·</span>
                <span>{firstName}</span>
              </>
            )}
            {dateStr && (
              <>
                <span aria-hidden className="text-[var(--text-tertiary)]">·</span>
                <span className="capitalize">{dateStr}</span>
              </>
            )}
            {timeStr && (
              <span className="font-mono text-xs tabular-nums text-[var(--text-tertiary)]">
                {timeStr}
              </span>
            )}
          </p>
        </div>
      </div>
    </motion.header>
  );
}

/** Status pill "Carte en ligne" avec dot vert pulsant. */
function StatusPill() {
  const { t } = usePanelLang();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--neon-success)]">
      <span className="relative flex size-1.5">
        <span
          aria-hidden
          className="pulse-dot absolute inset-0 rounded-full bg-[var(--neon-success)]"
        />
        <span className="relative size-1.5 rounded-full bg-[var(--neon-success)]" />
      </span>
      {t("home.status.online")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// QUICK ACTIONS
// ---------------------------------------------------------------------------

const TONE_STYLES: Record<
  QuickActionTone,
  { bg: string; text: string; glow: string; border: string }
> = {
  cyan: {
    bg: "bg-[var(--neon-cyan-soft)]",
    text: "text-[var(--neon-cyan)]",
    glow: "group-hover:shadow-[0_0_24px_rgba(0,229,255,0.35)]",
    border: "group-hover:border-[var(--neon-cyan)]/40",
  },
  violet: {
    bg: "bg-[var(--neon-violet-soft)]",
    text: "text-[var(--neon-violet)]",
    glow: "group-hover:shadow-[0_0_24px_rgba(177,108,255,0.35)]",
    border: "group-hover:border-[var(--neon-violet)]/40",
  },
  success: {
    bg: "bg-[var(--neon-success-soft)]",
    text: "text-[var(--neon-success)]",
    glow: "group-hover:shadow-[0_0_24px_rgba(0,255,163,0.30)]",
    border: "group-hover:border-[var(--neon-success)]/40",
  },
  danger: {
    bg: "bg-[var(--neon-danger-soft)]",
    text: "text-[var(--neon-danger)]",
    glow: "group-hover:shadow-[0_0_24px_rgba(255,61,113,0.30)]",
    border: "group-hover:border-[var(--neon-danger)]/40",
  },
};

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  iconKey: QuickActionIconKey;
  tone?: QuickActionTone;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {actions.map((a, i) => {
        const Icon = QUICK_ACTION_ICONS[a.iconKey] ?? Sparkles;
        const tone = TONE_STYLES[a.tone ?? "cyan"];
        return (
          <motion.a
            key={a.href}
            href={a.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -2 }}
            className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 backdrop-blur-md transition-all duration-200 hover:bg-[var(--bg-glass-hover)] ${tone.border} ${tone.glow}`}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${tone.bg} ${tone.text} ring-1 ring-current/20`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight text-[var(--text-primary)]">
                {a.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {a.description}
              </p>
            </div>
            <ArrowUpRight
              className="size-4 shrink-0 text-[var(--text-tertiary)] opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
              strokeWidth={1.75}
            />
          </motion.a>
        );
      })}
    </div>
  );
}
