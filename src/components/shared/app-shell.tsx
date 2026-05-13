"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { CommandPalette } from "./command-palette";
import { PageTransition } from "./page-transition";
import { SidebarCollapseProvider } from "./sidebar-collapse-context";
import { Topbar } from "./topbar";

/**
 * AppShell orchestrateur responsive mobile/desktop.
 *
 * Spec : `docs/design-system-mobile.md` §10 Shell responsive
 *
 * Architecture v2 (post-fix bug navigation répétée) :
 *   - `{children}` est rendu UNE SEULE FOIS dans un <main> partagé avec
 *     padding adaptatif. Évite le double-mount de PageTransition (Framer
 *     Motion AnimatePresence) qui causait un blocage de page après plusieurs
 *     navigations rapides les 2 AnimatePresence se battaient sur le
 *     exit/enter.
 *   - La sidebar desktop est fixed à gauche, la mobile-top-bar/bottom-nav
 *     sont aussi fixed (déjà). Le main gère l'offset via padding/margin
 *     responsive : px-4 mobile / pl-[260px] lg quand sidebar étendue.
 *
 * - < 1024px (mobile shell) : MobileTopBar (rétractable) + content + MobileBottomNav
 * - ≥ 1024px (desktop shell) : sidebar fixed + topbar sticky + content
 */

interface AppShellProps {
  user: { name?: string | null; email: string };
  scope: "admin" | "dashboard";
  /**
   * Contenu de la sidebar desktop (ReactNode, safe RSC).
   * Les enfants lisent l'état `collapsed` via `useSidebarCollapse()`.
   */
  sidebar: React.ReactNode;
  /** Slot gauche topbar desktop (ex: restaurant switcher). */
  topbarLeftSlot?: React.ReactNode;
  /** État initial collapse desktop (lu depuis cookie côté serveur). */
  defaultCollapsed?: boolean;
  /** Titre passé au MobileTopBar (par défaut, vide). */
  mobileTitle?: string;
  /** Slot gauche mobile (ex: switcher resto compact, fallback sur back si non défini ET pas racine). */
  mobileLeftSlot?: React.ReactNode;
  /** ID du resto actif (scope dashboard uniquement) alimente l'item central
      de la BottomNav qui ouvre la carte publique en nouvel onglet. */
  activeRestaurantId?: string | null;
  children: React.ReactNode;
}

const COLLAPSED_COOKIE = "ruliz_sidebar_collapsed";

export function AppShell({
  user,
  scope,
  sidebar,
  topbarLeftSlot,
  defaultCollapsed = false,
  mobileTitle,
  mobileLeftSlot,
  activeRestaurantId = null,
  children,
}: AppShellProps) {
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.cookie = `${COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      }
      return next;
    });
  }, []);

  // Raccourci ⌘B pour collapse/expand sidebar (desktop only)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
      // ⌘K ouvre la command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const contextValue = React.useMemo(
    () => ({ collapsed, toggle: toggleCollapsed }),
    [collapsed, toggleCollapsed],
  );

  return (
    <SidebarCollapseProvider value={contextValue}>
      <div className="relative min-h-dvh-screen">
        <div className="ambient-bg" aria-hidden>
          <span className="blob" />
        </div>

        {/* === MOBILE chrome (fixed, hidden ≥ lg) === */}
        <div className="lg:hidden">
          <MobileTopBar
            leftSlot={mobileLeftSlot}
            title={mobileTitle}
            showSearch
            onSearchClick={() => setCommandOpen(true)}
          />
          <MobileBottomNav scope={scope} activeRestaurantId={activeRestaurantId} />
        </div>

        {/* === DESKTOP grid (≥ lg) : sidebar | (topbar + main).
            Sur mobile (< lg) : 1 colonne, sidebar hidden, content prend tout.
            children est rendu UNE SEULE FOIS dans le <main> partagé → fix
            du bug navigation répétée (double PageTransition AnimatePresence). */}
        <div
          className={cn(
            "relative grid min-h-screen",
            "grid-cols-1",
            "lg:transition-[grid-template-columns] lg:duration-300",
            collapsed
              ? "lg:grid-cols-[72px_1fr]"
              : "lg:grid-cols-[260px_1fr]",
          )}
          style={{ transitionTimingFunction: "var(--ease-default)" }}
        >
          {/* Sidebar desktop only */}
          <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl lg:flex">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--border-glass-hover)] to-transparent"
            />
            {sidebar}
          </aside>

          {/* Colonne main : topbar desktop + content + PageTransition unique */}
          <div className="flex min-w-0 flex-col">
            {/* Topbar desktop only hidden mobile */}
            <div className="hidden lg:block">
              <Topbar
                user={user}
                onOpenCommand={() => setCommandOpen(true)}
                leftSlot={topbarLeftSlot}
              />
            </div>

            <main
              className={cn(
                "flex-1",
                // Mobile : padding pour topbar fixed + bottomnav fixed
                "px-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] pt-[calc(56px+env(safe-area-inset-top)+16px)]",
                // Desktop : padding standard (topbar dans le flow, pas fixed)
                "lg:px-6 lg:py-8 lg:pb-8 lg:pt-0",
              )}
            >
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>

        <CommandPalette
          scope={scope}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>
    </SidebarCollapseProvider>
  );
}

export { COLLAPSED_COOKIE };
