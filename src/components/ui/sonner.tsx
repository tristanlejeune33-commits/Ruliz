"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";

/**
 * Toaster wrapper Sonner aligné DS Ruliz.
 *
 * Position responsive (cf. docs/design-system-mobile.md §8 Toast) :
 *   - Mobile : `bottom-center`, offset au-dessus de la BottomNav (64px) +
 *     safe-area, largeur ~ 100% - 32px latéral
 *   - Desktop : `bottom-right` (standard SaaS)
 *
 * Sur mobile, le `mobileOffset` Sonner décale automatiquement de la valeur
 * fournie (en plus de safe-area-inset).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={isMobile ? "bottom-center" : "bottom-right"}
      // Sur mobile, on remonte le toast au-dessus de la bottom nav (64px) + 8px d'air.
      // Sonner ajoute env(safe-area-inset-bottom) automatiquement.
      mobileOffset={isMobile ? 72 : undefined}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-card)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border-subtle)] group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-[var(--text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--accent-foreground)]",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-elevated)] group-[.toast]:text-[var(--text-secondary)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
