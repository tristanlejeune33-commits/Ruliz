"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { PageTransition } from "./page-transition";
import { SidebarCollapseProvider } from "./sidebar-collapse-context";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: { name?: string | null; email: string };
  scope: "admin" | "dashboard";
  /**
   * Contenu de la sidebar (ReactNode, pas de fonction → safe RSC).
   * Les composants enfants (SidebarBrand, SidebarNav, SidebarFooter) lisent
   * l'état `collapsed` via le context `useSidebarCollapse()`.
   */
  sidebar: React.ReactNode;
  /** Slot gauche dans la topbar (ex: restaurant switcher). */
  topbarLeftSlot?: React.ReactNode;
  /** État initial du collapse (lu depuis cookie côté serveur). */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const COLLAPSED_COOKIE = "ruliz_sidebar_collapsed";

export function AppShell({
  user,
  scope,
  sidebar,
  topbarLeftSlot,
  defaultCollapsed = false,
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

  // Raccourci ⌘B pour collapse/expand sidebar
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  // Mémorise le contextValue pour éviter les re-renders sur tous les consumers
  const contextValue = React.useMemo(
    () => ({ collapsed, toggle: toggleCollapsed }),
    [collapsed, toggleCollapsed],
  );

  return (
    <SidebarCollapseProvider value={contextValue}>
      <div className="relative min-h-screen">
        <div className="ambient-bg" aria-hidden>
          <span className="blob" />
        </div>

        <div
          className={cn(
            "relative grid min-h-screen transition-[grid-template-columns] duration-300",
            collapsed
              ? "grid-cols-1 md:grid-cols-[72px_1fr]"
              : "grid-cols-1 md:grid-cols-[240px_1fr]",
          )}
          style={{ transitionTimingFunction: "var(--ease-default)" }}
        >
          <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl md:flex">
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
            <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
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
