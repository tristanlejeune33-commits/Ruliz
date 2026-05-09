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
  /** Variante d'accent pour le glow décoratif. */
  accent?: "default" | "menu" | "resto" | "qrcodes";
  className?: string;
}

const ACCENT_GLOWS: Record<NonNullable<PageHeroProps["accent"]>, string> = {
  default:
    "from-[var(--accent)]/12 via-[var(--accent)]/5 to-transparent",
  menu: "from-[oklch(0.7_0.18_145)]/15 via-[var(--accent)]/8 to-transparent",
  resto: "from-[oklch(0.65_0.22_25)]/12 via-[var(--accent)]/8 to-transparent",
  qrcodes: "from-[oklch(0.6_0.25_280)]/15 via-[var(--accent)]/8 to-transparent",
};

/**
 * Header de page haut-de-gamme — gradient mesh subtil, typographie display,
 * slots dédiés pour eyebrow / actions / KPIs.
 *
 * Pensé pour être réutilisé sur tous les écrans dashboard (Menu, Mon resto,
 * QR codes, etc.) afin d'unifier l'identité visuelle.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  kpis,
  accent = "default",
  className,
}: PageHeroProps) {
  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-6 py-7 sm:px-8",
        className,
      )}
    >
      {/* Glow décoratif */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-gradient-to-br opacity-90 blur-3xl",
          ACCENT_GLOWS[accent],
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-72 rounded-full bg-gradient-to-tl from-[var(--accent)]/8 via-transparent to-transparent opacity-60 blur-3xl"
      />
      {/* Grille subtile */}
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
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
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

/**
 * Petit chip d'eyebrow — texte court + icône optionnelle, ton uniforme.
 */
export function HeroEyebrow({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)] backdrop-blur",
        className,
      )}
    >
      {icon && <span className="text-[var(--accent)]">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * KPI chip pour la zone droite du PageHero — valeur mise en avant + label.
 */
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
        "flex items-baseline gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 px-3 py-1.5 backdrop-blur",
        className,
      )}
    >
      <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      {hint && (
        <span className="text-[10px] text-[var(--text-secondary)]">{hint}</span>
      )}
    </div>
  );
}
