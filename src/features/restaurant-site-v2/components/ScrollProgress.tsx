"use client";

import { useEffect, useRef } from "react";

/**
 * Barre de progression du scroll, 2px haut de page, couleur accent.
 * On utilise un ref + transform scaleX au lieu de width pour rester
 * GPU-friendly et éviter les reflows.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max <= 0 ? 0 : window.scrollY / max;
      el.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="rs2-scroll-progress" aria-hidden>
      <div ref={ref} />
    </div>
  );
}
