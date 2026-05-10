"use client";

import { useEffect, useState } from "react";

/**
 * Détecte si l'on est sous le breakpoint `lg` (1024px), donc en mode shell mobile.
 *
 * ⚠️ SSR-safe : retourne `false` au premier render (matchMedia indispo côté
 * serveur). Toujours utiliser `useIsMobile()` en complément du swap CSS via
 * `lg:hidden` / `hidden lg:block`, jamais en remplacement (sinon flash
 * d'hydratation visible).
 *
 * Usage type :
 *   const isMobile = useIsMobile();
 *   // → typiquement pour basculer le COMPORTEMENT (action différente),
 *   //   pas l'AFFICHAGE (qui doit utiliser le CSS).
 */
export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
