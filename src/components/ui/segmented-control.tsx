"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

/**
 * SegmentedControl — sélecteur iOS-style avec pill animé.
 *
 * Spec : `docs/design-system-mobile.md` §8 SegmentedControl
 *
 * - Container fond glass-strong, segment actif fond bg-primary + ombre subtile
 * - Hauteur 36px (compact) ou 44px (standard, défaut mobile)
 * - Scroll horizontal si > 4 segments avec scroll-snap
 * - Haptic léger au switch
 *
 * Usage type :
 *   <SegmentedControl
 *     value={periode}
 *     onChange={setPeriode}
 *     options={[
 *       { value: "7j",  label: "7 jours" },
 *       { value: "30j", label: "30 jours" },
 *       { value: "90j", label: "90 jours" },
 *     ]}
 *   />
 */

interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** `default` = 44px (mobile touch). `compact` = 36px (desktop dense). */
  size?: "default" | "compact";
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  size = "default",
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const id = React.useId();
  const handleSelect = (next: T) => {
    if (next === value) return;
    haptic.selection();
    onChange(next);
  };

  // Si > 4 options : scroll horizontal pour ne pas serrer sur mobile
  const horizontalScroll = options.length > 4;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--bg-glass-strong)] p-1",
        "border border-[var(--border-glass)]",
        horizontalScroll &&
          "scroll-snap-x no-scrollbar w-full max-w-full overflow-x-auto",
        size === "default" ? "h-11" : "h-9",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "relative flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 font-medium transition-colors",
              "snap-center",
              size === "default" ? "h-9 text-sm" : "h-7 text-xs",
              active
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--bg-primary)] shadow-sm ring-1 ring-[var(--border-glass-hover)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {opt.icon && <span className="relative z-10 [&_svg]:size-4">{opt.icon}</span>}
            <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
