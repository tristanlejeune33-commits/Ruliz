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
 * AppShell — orchestrateur responsive mobile/desktop.
 *
 * Spec : `docs/design-system-mobile.md` §10 Shell responsive
 *
 * Stratégie : un seul DOM, swap CSS via `lg:` breakpoint (1024px). Évite le
 * flash hydratation que produirait un `useIsMobile()` côté client. Coût payload
 * négligeable (< 5kb pour les deux navs).
 *
 * - < 1024px (mobile shell) : MobileTopBar (rétractable) + content + MobileBottomNav
 * - ≥ 1024px (desktop shell) : sidebar collapsible + topbar + content
 *
 * ⚠️ Tradeoff connu V1 : `{children}` est mounté dans les deux branches (l'une
 * cachée par CSS `display:none`). Les Server Components fetch sont dedupés
 * par Next.js, donc pas de double appel DB. Les effets de Client Components
 * dans les pages enfants peuvent fire 2× — à monitorer en perf review. Si gênant,
 * migrer vers une structure unique (sidebar/topbar/bottomnav en éléments fixed
 * frères, main partagé avec padding adaptatif).
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

        {/* ============= MOBILE SHELL (< lg) ============= */}
        <div className="lg:hidden">
          <MobileTopBar
            leftSlot={mobileLeftSlot}
            title={mobileTitle}
            showSearch
            onSearchClick={() => setCommandOpen(true)}
          />
          {/* Padding-top = topbar 56 + safe-top, padding-bottom = bottomnav 64 + safe-bottom */}
          <main className="px-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] pt-[calc(56px+env(safe-area-inset-top)+16px)]">
            <PageTransition>{children}</PageTransition>
          </main>
          <MobileBottomNav scope={scope} />
        </div>

        {/* ============= DESKTOP SHELL (≥ lg) ============= */}
        <div
          className={cn(
            "relative hidden min-h-screen lg:grid",
            "transition-[grid-template-columns] duration-300",
            collapsed
              ? "grid-cols-[72px_1fr]"
              : "grid-cols-[260px_1fr]",
          )}
          style={{ transitionTimingFunction: "var(--ease-default)" }}
        >
          <aside className="sticky top-0 flex h-screen flex-col border-r border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--border-glass-hover)] to-transparent"
            />
            {sidebar}
          </aside>

          <div className="flex min-w-0 flex-col">
            <Topbar
              user={user}
              onOpenCommand={() => setCommandOpen(true)}
              leftSlot={topbarLeftSlot}
            />
            <main className="flex-1 px-6 py-8">
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
