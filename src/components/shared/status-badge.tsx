import { cn } from "@/lib/utils";

const STATUTS = {
  actif: {
    label: "Actif",
    classes:
      "border-[oklch(0.7_0.18_145)]/30 bg-[oklch(0.7_0.18_145)]/15 text-[oklch(0.75_0.18_145)]",
  },
  suspendu: {
    label: "Suspendu",
    classes:
      "border-[oklch(0.75_0.18_70)]/30 bg-[oklch(0.75_0.18_70)]/15 text-[oklch(0.78_0.18_70)]",
  },
  archive: {
    label: "Archivé",
    classes:
      "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)]",
  },
  demo_terminee: {
    label: "Démo terminée",
    classes:
      "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
  },
} as const;

export type Statut = keyof typeof STATUTS;

export function StatusBadge({
  statut,
  className,
}: {
  statut: Statut;
  className?: string;
}) {
  const config = STATUTS[statut];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.classes,
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden
      />
      {config.label}
    </span>
  );
}

const PLANS = {
  freemium: {
    label: "Freemium",
    classes:
      "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
  },
  pro: {
    label: "Pro",
    classes:
      "border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]",
  },
  premium: {
    label: "Premium",
    classes:
      "border-[oklch(0.65_0.22_310)]/30 bg-[oklch(0.65_0.22_310)]/15 text-[oklch(0.7_0.22_310)]",
  },
} as const;

export type Plan = keyof typeof PLANS;

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const config = PLANS[plan];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
