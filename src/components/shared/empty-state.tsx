"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Action principale */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  /** Action secondaire */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Couleur d'accent pour l'icône (CSS color) */
  accentColor?: string;
}

/**
 * Empty state avec illustration animée + CTA.
 *
 * Utiliser à chaque fois qu'une liste, un tableau ou une section
 * n'a pas encore de données. Évite les "Aucune donnée" tristes.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  accentColor = "var(--accent)",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 px-6 py-16 text-center"
    >
      {/* Icone avec halo lumineux pulsant */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: accentColor }}
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="relative flex size-16 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]"
          style={{
            boxShadow: `0 0 24px ${accentColor}25`,
          }}
        >
          <Icon className="size-7" style={{ color: accentColor }} />
        </div>
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild>
                <a href={action.href}>
                  {action.icon && <action.icon className="size-3.5" />}
                  {action.label}
                </a>
              </Button>
            ) : (
              <Button onClick={action.onClick}>
                {action.icon && <action.icon className="size-3.5" />}
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button asChild variant="ghost">
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : (
              <Button onClick={secondaryAction.onClick} variant="ghost">
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </motion.div>
  );
}
