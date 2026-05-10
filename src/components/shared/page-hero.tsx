import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  /** Petit chip qui s'affiche au-dessus du titre (icône + libellé). */
  eyebrow?: React.ReactNode;
  /** Titre H1 de la page. */
  title: React.ReactNode;
  /** Description sous le titre — 1 ligne idéalement. */
  description?: React.ReactNode;
  /** Slot d'actions (boutons) à droite, en haut. */
  actions?: React.ReactNode;
  /** Slot KPI / chips à droite, sous les actions. */
  kpis?: React.ReactNode;
  /** Variante d'accent — strictement DS Ruliz (cyan/violet/success/danger). */
  accent?: "cyan" | "violet" | "success" | "danger";
  className?: string;
}

const ACCENT_GLOWS: Record<NonNullable<PageHeroProps["accent"]>, string> = {
  cyan: "bg-[var(--neon-cyan)]/15",
  violet: "bg-[var(--neon-violet)]/15",
  success: "bg-[var(--neon-success)]/12",
  danger: "bg-[var(--neon-danger)]/12",
};

const ACCENT_GLOWS_2: Record<NonNullable<PageHeroProps["accent"]>, string> = {
  cyan: "bg-[var(--neon-violet)]/10",
  violet: "bg-[var(--neon-cyan)]/12",
  success: "bg-[var(--neon-cyan)]/10",
  danger: "bg-[var(--neon-violet)]/8",
};

/**
 * Header de page haut-de-gamme — DS Ruliz (glass + néon).
 * - Glass surface + backdrop-blur
 * - 2 glows ambiants colorés selon l'accent
 * - Grille décorative subtile
 * - Slots eyebrow / title / description / actions / kpis
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  kpis,
  accent = "cyan",
  className,
}: PageHeroProps) {
  return (
    <header
      className={cn(
        // En dark : glass + backdrop-blur. En light : surface blanche + ombres
        // (le backdrop-blur est neutralisé par l'utility theme-aware) + ring
        // intérieur bleu 8% via .card-double-layer (innovation #2 du DS light).
        "card-double-layer relative isolate overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] px-5 py-6 backdrop-blur-2xl sm:px-6 sm:py-7 lg:px-8",
        className,
      )}
    >
      {/* Glow primaire */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -left-24 size-72 rounded-full blur-3xl",
          ACCENT_GLOWS[accent],
        )}
      />
      {/* Glow secondaire */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full blur-3xl",
          ACCENT_GLOWS_2[accent],
        )}
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
        <div className="min-w-0 max-w-3xl space-y-2">
          {eyebrow && (
            <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>
          )}
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-pretty text-sm text-[var(--text-secondary)] sm:text-base">
              {description}
            </p>
          )}
        </div>
        {(actions || kpis) && (
          <div className="flex flex-col items-stretch gap-3 lg:items-end">
            {actions && (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {actions}
              </div>
            )}
            {kpis && (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {kpis}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/** Petit chip d'eyebrow — DS Ruliz. */
export function HeroEyebrow({
  icon,
  children,
  className,
  tone = "cyan",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "cyan" | "violet" | "success" | "danger" | "neutral";
}) {
  const TONE_CLASSES: Record<NonNullable<typeof tone>, string> = {
    cyan: "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
    violet:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
    success:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
    danger:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
    neutral:
      "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** KPI chip pour la zone droite du PageHero. */
export function HeroKpi({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 py-1.5 backdrop-blur",
        className,
      )}
    >
      <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
        {label}
      </span>
      {hint && (
        <span className="text-[10px] text-[var(--text-secondary)]">{hint}</span>
      )}
    </div>
  );
}
