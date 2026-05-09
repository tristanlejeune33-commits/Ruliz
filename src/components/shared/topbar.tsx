"use client";

import { Bell, PanelLeft, PanelLeftClose, Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BreadcrumbNav } from "@/components/shared/breadcrumb-nav";
import { PreviewLangPicker } from "@/components/shared/preview-lang-picker";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { cn } from "@/lib/utils";

interface TopbarProps {
  user: { name?: string | null; email: string };
  onOpenCommand?: () => void;
  /** Slot pour insérer un switcher (ex: restaurant) à gauche */
  leftSlot?: React.ReactNode;
  /** Etat actuel du collapse de la sidebar */
  sidebarCollapsed?: boolean;
  /** Callback toggle sidebar */
  onToggleSidebar?: () => void;
}

export function Topbar({
  user,
  onOpenCommand,
  leftSlot,
  sidebarCollapsed = false,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl">
      {/* Glow décoratif fin sous la topbar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[var(--neon-cyan)]/25 to-transparent"
      />
      <div className="relative flex h-full items-center gap-2 px-3 md:gap-3 md:px-5">
        {/* Toggle sidebar (desktop) */}
        {onToggleSidebar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] md:inline-flex"
                aria-label={
                  sidebarCollapsed
                    ? "Déployer la sidebar"
                    : "Réduire la sidebar"
                }
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="size-4" strokeWidth={1.75} />
                ) : (
                  <PanelLeftClose className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              <span className="flex items-center gap-2">
                {sidebarCollapsed ? "Déployer" : "Réduire"}
                <Kbd>⌘B</Kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {leftSlot}
          <BreadcrumbNav />
        </div>

        {/* Search ⌘K — bouton custom glass avec hover néon */}
        <button
          type="button"
          onClick={onOpenCommand}
          className={cn(
            "group relative ml-auto hidden h-9 min-w-[200px] items-center gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 text-xs text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--neon-cyan)]/30 hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] md:inline-flex lg:min-w-[260px]",
          )}
          aria-label="Rechercher (Cmd+K)"
        >
          <Search
            className="size-3.5 transition-colors group-hover:text-[var(--neon-cyan)]"
            strokeWidth={1.75}
          />
          <span className="flex-1 text-left">Recherche rapide…</span>
          <Kbd>⌘K</Kbd>
        </button>

        {/* Cloche notifs — placeholder visuel avec dot néon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
              aria-label="Notifications (3 non lues)"
            >
              <Bell className="size-4" strokeWidth={1.75} />
              {/* Dot néon */}
              <span
                aria-hidden
                className="absolute right-2 top-2 flex size-2"
              >
                <span className="pulse-dot absolute inset-0 rounded-full bg-[var(--neon-danger)]" />
                <span className="relative size-2 rounded-full bg-[var(--neon-danger)] ring-2 ring-[var(--bg-primary)]" />
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            Notifications
          </TooltipContent>
        </Tooltip>

        <span
          aria-hidden
          className="mx-1 hidden h-5 w-px bg-[var(--border-glass)] sm:block"
        />

        <div className="flex items-center gap-1">
          <PreviewLangPicker />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
