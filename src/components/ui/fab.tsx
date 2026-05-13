"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { haptic } from "@/lib/haptic";

/**
 * FAB · Floating Action Button mobile.
 *
 * Spec : `docs/design-system-mobile.md` §8 FAB
 *
 * Comportement :
 *   - 56×56, fond accent, ombre marquée, position bottom-right
 *   - Marges 16px + safe-area-inset-bottom + 64px (au-dessus de la BottomNav)
 *   - Disparaît au scroll-down, réapparaît au scroll-up (Twitter / iOS Mail)
 *   - Haptic léger au tap
 *   - Hidden ≥ lg (le FAB est un pattern mobile, on utilise un bouton inline
 *     dans la PageHero sur desktop)
 *
 * Usage type :
 *   <FAB icon={<Plus />} label="Ajouter un plat" onClick={...} />
 *
 *   ou avec asChild pour wrapper un Link :
 *   <FAB asChild icon={<Plus />} label="Ajouter un plat">
 *     <Link href="/dashboard/menu/new" />
 *   </FAB>
 */

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icône principale (lucide). Sera rendue à 24×24 dans un container 56×56. */
  icon: React.ReactNode;
  /** Aria-label obligatoire (le FAB n'a pas de texte visible). */
  label: string;
  /** Cache le FAB au scroll vers le bas (défaut true). */
  hideOnScroll?: boolean;
  /** Couleur custom : `accent` (défaut) ou `neutral` (pour scope admin). */
  tone?: "accent" | "neutral";
  /** Pour wrapper un Link : `<FAB asChild ...><Link href=... /></FAB>` */
  asChild?: boolean;
}

export const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  (
    {
      icon,
      label,
      hideOnScroll = true,
      tone = "accent",
      asChild = false,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const dir = useScrollDirection({ threshold: 12 });
    const hidden = hideOnScroll && dir === "down";

    const Comp = asChild ? Slot : "button";

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      haptic.light();
      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        aria-label={label}
        onClick={handleClick}
        className={cn(
          "fixed right-4 size-14 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "active:scale-95",
          "lg:hidden",
          tone === "accent"
            ? "bg-[var(--neon-cyan)] text-[var(--bg-primary)] shadow-fab"
            : "bg-[var(--bg-glass-strong)] text-[var(--text-primary)] border border-[var(--border-glass)] shadow-lg",
          hidden
            ? "translate-y-[calc(100%+24px)] opacity-0"
            : "translate-y-0 opacity-100",
          // Position : au-dessus de la BottomNav (64px) + safe-area + 16px
          "bottom-[calc(64px+env(safe-area-inset-bottom)+16px)]",
          // Z-index entre FAB et BottomNav (la nav doit rester au-dessus)
          "z-[var(--z-fab)]",
          // Icône taille
          "[&_svg]:size-6 [&_svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {asChild ? icon : icon}
      </Comp>
    );
  },
);
FAB.displayName = "FAB";
