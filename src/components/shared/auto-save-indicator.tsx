"use client";

import { Check, CircleAlert, Loader2 } from "lucide-react";
import type { AutoSaveStatus } from "@/lib/use-auto-save";

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  errorMessage?: string;
  className?: string;
}

/**
 * Petit indicateur visuel à coller à côté du titre du form.
 * Compagnon visuel du hook useAutoSave().
 */
export function AutoSaveIndicator({
  status,
  errorMessage,
  className,
}: AutoSaveIndicatorProps) {
  if (status === "idle") return null;

  const config: Record<
    Exclude<AutoSaveStatus, "idle">,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    pending: {
      label: "Modifications…",
      icon: <span className="size-2 rounded-full bg-current" />,
      color: "text-[var(--text-muted)]",
    },
    saving: {
      label: "Sauvegarde…",
      icon: <Loader2 className="size-3 animate-spin" />,
      color: "text-[var(--text-muted)]",
    },
    saved: {
      label: "Sauvegardé",
      icon: <Check className="size-3" />,
      color: "text-[var(--neon-success)]",
    },
    error: {
      label: errorMessage || "Erreur de sauvegarde",
      icon: <CircleAlert className="size-3" />,
      color: "text-[var(--neon-danger)]",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${c.color} ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      {c.icon}
      {c.label}
    </span>
  );
}
