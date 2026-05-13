"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { motion, useTransform, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

/**
 * MobileTopBar · barre supérieure mobile, rétractable au scroll.
 *
 * Spec : `docs/design-system-mobile.md` §9 Top Bar
 *
 *   - 56px de hauteur + safe-area-inset-top
 *   - Layout : [back / switcher] [titre tronqué] [action]
 *   - Se cache au scroll-down de > 8px, réapparaît au scroll-up
 *   - Ombre subtile révélée au scroll > 8px (border-bottom progressif)
 *   - Bouton back : touch target 44×44 (icon 24 + padding)
 *   - z-index --z-sticky
 *
 * Hidden ≥ lg (la topbar desktop reprend le relais).
 *
 * Usage type :
 *   <MobileTopBar
 *     leftSlot={<RestaurantSwitcher ... />}
 *     title="Tableau de bord"
 *     showSearch
 *     onSearchClick={() => router.push('/dashboard/search')}
 *   />
 *
 *   ou avec back :
 *   <MobileTopBar showBack title="Modifier le plat" />
 */

interface MobileTopBarProps {
  /** Affiche le bouton retour à gauche (push history.back). */
  showBack?: boolean;
  /** Slot gauche custom (ex: RestaurantSwitcher) · ignoré si showBack=true. */
  leftSlot?: React.ReactNode;
  /** Titre centré, tronqué si trop long. */
  title?: string;
  /** Affiche l'icône loupe à droite. */
  showSearch?: boolean;
  onSearchClick?: () => void;
  /** Slot droit custom · ignoré si showSearch=true. */
  rightSlot?: React.ReactNode;
}

export function MobileTopBar({
  showBack = false,
  leftSlot,
  title,
  showSearch = false,
  onSearchClick,
  rightSlot,
}: MobileTopBarProps) {
  const router = useRouter();
  const { scrollY } = useScroll();

  // Hide la barre au scroll-down (translate-y full)
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const lastY = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - lastY.current;
    setScrolled(y > 8);
    if (Math.abs(delta) > 8) {
      // En haut de page, force visible
      if (y < 16) {
        setHidden(false);
      } else {
        setHidden(delta > 0);
      }
      lastY.current = y;
    }
  });

  const handleBack = () => {
    haptic.light();
    router.back();
  };

  const handleSearch = () => {
    haptic.light();
    onSearchClick?.();
  };

  return (
    <motion.header
      role="banner"
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "fixed inset-x-0 top-0 lg:hidden",
        "bg-[var(--bg-glass)] backdrop-blur-2xl",
        "transition-shadow duration-200",
        scrolled
          ? "shadow-[0_1px_0_var(--border-glass-hover),0_4px_12px_rgba(0,0,0,0.08)]"
          : "shadow-none border-b border-transparent",
        "safe-top",
      )}
      style={{ zIndex: "var(--z-sticky)" }}
    >
      <div className="flex h-14 items-center gap-2 px-2">
        {/* Gauche : back ou slot custom */}
        <div className="flex shrink-0 items-center">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour"
              className={cn(
                "tap-44 flex items-center justify-center rounded-full",
                "text-[var(--text-primary)]",
                "active:scale-95 transition-transform",
                "hover:bg-[var(--bg-glass-hover)]",
              )}
            >
              <ChevronLeft className="size-6" strokeWidth={1.75} />
            </button>
          ) : (
            leftSlot
          )}
        </div>

        {/* Centre : titre tronqué */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          {title && (
            <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
          )}
        </div>

        {/* Droite : search ou slot custom */}
        <div className="flex shrink-0 items-center gap-1">
          {showSearch && (
            <button
              type="button"
              onClick={handleSearch}
              aria-label="Recherche"
              className={cn(
                "tap-44 flex items-center justify-center rounded-full",
                "text-[var(--text-primary)]",
                "active:scale-95 transition-transform",
                "hover:bg-[var(--bg-glass-hover)]",
              )}
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>
          )}
          {!showSearch && rightSlot}
        </div>
      </div>
    </motion.header>
  );
}
