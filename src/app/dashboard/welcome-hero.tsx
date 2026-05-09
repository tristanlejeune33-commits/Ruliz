"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, type LucideIcon } from "lucide-react";

interface WelcomeHeroProps {
  firstName: string;
  restaurantName: string;
  /** Optional plan badge à afficher à côté du badge de bienvenue */
  planBadge?: React.ReactNode;
}

/**
 * Header de bienvenue dynamique avec :
 * - Salutation contextuelle ("Bonjour" / "Bon après-midi" / "Bonsoir")
 * - Heure courante affichée façon clock digital
 * - Badge "Bienvenue" + plan + animation d'entrée
 * - Subtle gradient background qui pulse doucement
 */
export function WelcomeHero({
  firstName,
  restaurantName,
  planBadge,
}: WelcomeHeroProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const greeting = now ? getTimeGreeting(now) : "Bonjour";
  const timeStr = now
    ? now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-elevated)] via-[var(--bg-card)] to-[var(--bg-elevated)] p-6 md:p-8"
    >
      {/* Fond animé subtil — orbe lumineux qui flotte */}
      <motion.div
        className="absolute -right-20 -top-20 size-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent)" }}
        animate={{
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              <Sparkles className="size-3" />
              {greeting}
            </span>
            {planBadge}
          </div>

          <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {greeting} {firstName} 👋
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
            Voici ce qui se passe sur la carte de{" "}
            <strong className="text-[var(--text-primary)]">
              {restaurantName}
            </strong>
            {" — "}
            <span className="font-mono text-xs tabular-nums">{timeStr}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  if (h < 22) return "Bonsoir";
  return "Bonne soirée";
}

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Couleur d'accent — CSS color */
  accentColor?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Grille de raccourcis (4-6 actions). Cards interactives avec hover qui scale.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {actions.map((a, i) => (
        <motion.a
          key={a.href}
          href={a.href}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -2 }}
          className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--accent)]/40"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
            style={{ background: `${a.accentColor ?? "var(--accent)"}15` }}
          >
            <a.icon
              className="size-4"
              style={{ color: a.accentColor ?? "var(--accent)" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--text-primary)]">{a.label}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {a.description}
            </p>
          </div>
          {/* Arrow indicator on hover */}
          <span className="opacity-0 transition-opacity group-hover:opacity-100 text-[var(--text-muted)]">
            →
          </span>
        </motion.a>
      ))}
    </div>
  );
}
