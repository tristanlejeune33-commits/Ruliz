"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Active le smooth scroll Lenis sur le site public.
 * Monté côté client uniquement — Lenis touche au scroll natif via raf.
 *
 * On désactive smoothTouch pour ne pas casser l'inertie native iOS
 * (qui est meilleure que celle de Lenis pour le tactile).
 */
export function LenisProvider() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
  return null;
}
