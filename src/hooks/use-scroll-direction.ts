"use client";

import { useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

/**
 * Détecte la direction de scroll vertical de la fenêtre.
 *
 * Usage type cacher le FAB et la top bar collapsible au scroll-down,
 * réafficher au scroll-up (pattern iOS Mail / Twitter) :
 *
 *   const dir = useScrollDirection({ threshold: 8 });
 *   <div className={dir === "down" ? "translate-y-full" : "translate-y-0"}>
 *
 * Le hook ignore les micro-mouvements < threshold pour éviter le flicker
 * pendant le scroll inertiel mobile.
 */
export function useScrollDirection({
  threshold = 8,
}: { threshold?: number } = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("idle");
  const lastY = useRef(0);
  const lastDir = useRef<ScrollDirection>("idle");
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) >= threshold) {
          const next: ScrollDirection = delta > 0 ? "down" : "up";
          // En haut de page on force "up" pour révéler la top bar
          const final: ScrollDirection = y < threshold ? "up" : next;
          if (final !== lastDir.current) {
            setDirection(final);
            lastDir.current = final;
          }
          lastY.current = y;
        }
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}
