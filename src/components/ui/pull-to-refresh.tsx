"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

/**
 * PullToRefresh pull-down sur scroll-top pour déclencher un refresh.
 *
 * Spec : `docs/design-system-mobile.md` §8 Patterns natifs
 *
 * - Threshold 80px de pull pour déclencher
 * - Spinner néon custom (cercle qui rotate)
 * - Haptic léger au déclenchement
 * - Désactivé ≥ lg (pattern mobile only)
 *
 * Usage type :
 *   <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *     <ListeStats ... />
 *   </PullToRefresh>
 *
 * ⚠️ Le scroll de la page entière est utilisé. Pour qu'il fonctionne, le
 * conteneur racine ne doit pas être scrollable lui-même (overflow auto sur
 * <body> pas sur un wrapper interne).
 */

const THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  /** Désactive complètement (ex: page sans data fetch). */
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = React.useState(false);
  const pullY = useMotionValue(0);
  const triggered = React.useRef(false);
  const startY = React.useRef<number | null>(null);

  // L'opacité du spinner suit la traction
  const spinnerOpacity = useTransform(pullY, [0, THRESHOLD], [0, 1]);
  const spinnerScale = useTransform(pullY, [0, THRESHOLD], [0.6, 1]);
  // Rotation continue pendant le refresh
  const spinnerRotation = useTransform(pullY, [0, THRESHOLD], [0, 180]);

  React.useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const t = e.touches[0];
      if (t) startY.current = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;
      if (dy <= 0) return;
      // Resistance : on diminue la sensibilité au-delà de THRESHOLD
      const resistance = dy < THRESHOLD ? dy * 0.6 : THRESHOLD * 0.6 + (dy - THRESHOLD) * 0.3;
      const clamped = Math.min(resistance, MAX_PULL);
      pullY.set(clamped);
      if (clamped >= THRESHOLD && !triggered.current) {
        triggered.current = true;
        haptic.medium();
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const final = pullY.get();
      startY.current = null;

      if (final >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        // Lock le spinner à THRESHOLD pendant l'attente
        animate(pullY, THRESHOLD, { type: "spring", stiffness: 380, damping: 32 });
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          animate(pullY, 0, { type: "spring", stiffness: 380, damping: 32 });
        }
      } else {
        animate(pullY, 0, { type: "spring", stiffness: 380, damping: 32 });
      }
      triggered.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, pullY, refreshing, onRefresh]);

  return (
    <div className={cn("relative lg:contents", className)}>
      {/* Indicateur fixe en haut, opacité/scale pilotés par le pull */}
      <motion.div
        aria-hidden={!refreshing}
        style={{
          opacity: spinnerOpacity,
          scale: spinnerScale,
          rotate: refreshing ? undefined : spinnerRotation,
        }}
        className={cn(
          "pointer-events-none fixed left-1/2 z-[var(--z-sticky)] -translate-x-1/2 lg:hidden",
          "top-[calc(56px+env(safe-area-inset-top)+12px)]",
          "flex size-10 items-center justify-center rounded-full",
          "bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-glass)]",
        )}
      >
        <Loader2
          className={cn(
            "size-5 text-[var(--neon-cyan)]",
            refreshing && "animate-spin",
          )}
          strokeWidth={2}
        />
      </motion.div>

      {/* Le contenu n'est pas déplacé visuellement (pas de translate sur la page
          entière UX plus stable que iOS native). Le spinner suffit comme feedback. */}
      {children}
    </div>
  );
}
