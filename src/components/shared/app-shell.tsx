"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { PageTransition } from "./page-transition";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: { name?: string | null; email: string };
  scope: "admin" | "dashboard";
  /**
   * Function ou ReactNode. Si fonction, reçoit { collapsed } pour adapter le
   * rendu de la sidebar au mode compact (icônes seules).
   */
  sidebar:
    | React.ReactNode
    | ((ctx: { collapsed: boolean }) => React.ReactNode);
  /** Slot gauche dans la topbar (ex: restaurant switcher). */
  topbarLeftSlot?: React.ReactNode;
  /** Cookie initial pour la persistence du collapsed state. */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const COLLAPSED_COOKIE = "ruliz_sidebar_collapsed";

/**
 * Shell global du dashboard — glass + néon.
 * - Ambient background fixed (3 blobs cyan/violet/vert via .ambient-bg)
 * - Sidebar collapsible 240px / 72px avec persistence cookie
 * - Topbar sticky glass
 * - Command palette ⌘K accessible de partout
 */
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

  // Persistence cookie — toggle persistant cross-session
  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.cookie = `${COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      }
      return next;
    });
  }, []);

  // Raccourci ⌘B (style VSCode) pour collapse/expand sidebar
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

  const renderedSidebar =
    typeof sidebar === "function" ? sidebar({ collapsed }) : sidebar;

  return (
    <div className="relative min-h-screen">
      {/* Ambient background : 3 blobs néon flous derrière toute l'app */}
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
        {/* Sidebar — glass strong + ligne dégradée à droite */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--border-glass-hover)] to-transparent"
          />
          {renderedSidebar}
        </aside>

        <div className="flex min-w-0 flex-col">
          <Topbar
            user={user}
            onOpenCommand={() => setCommandOpen(true)}
            leftSlot={topbarLeftSlot}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleCollapsed}
          />
          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <CommandPalette scope={scope} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export { COLLAPSED_COOKIE };
