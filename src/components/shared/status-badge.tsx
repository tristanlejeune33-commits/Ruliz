import { cn } from "@/lib/utils";

const STATUTS = {
  actif: {
    label: "Actif",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  suspendu: {
    label: "Suspendu",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  archive: {
    label: "Archivé",
    classes:
      "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
  },
  demo_terminee: {
    label: "Démo terminée",
    classes:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
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
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {config.label}
    </span>
  );
}

const PLANS = {
  freemium: {
    label: "Freemium",
    classes:
      "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)]",
  },
  pro: {
    label: "Pro",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  },
  premium: {
    label: "Premium",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
} as const;

export type Plan = keyof typeof PLANS;

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const config = PLANS[plan];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
