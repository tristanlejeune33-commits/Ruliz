"use client";

import { createContext, useContext } from "react";

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  collapsed: false,
  toggle: () => {},
});

export const SidebarCollapseProvider = SidebarCollapseContext.Provider;

/**
 * Hook qui expose l'état collapsed + le toggle. Tout composant client de la
 * sidebar/topbar peut s'y abonner sans que les layouts (Server Components)
 * aient à passer la valeur via props (ce qui casserait la frontière RSC).
 */
export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}
