"use client";

import { PanelLeft, PanelLeftClose, Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BreadcrumbNav } from "@/components/shared/breadcrumb-nav";
import { CartIconButton } from "@/components/shared/cart-icon-button";
import { PreviewLangPicker } from "@/components/shared/preview-lang-picker";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { useSidebarCollapse } from "@/components/shared/sidebar-collapse-context";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { cn } from "@/lib/utils";

interface TopbarProps {
  user: { name?: string | null; email: string };
  onOpenCommand?: () => void;
  /** Slot pour insérer un switcher (ex: restaurant) à gauche */
  leftSlot?: React.ReactNode;
}

export function Topbar({ user, onOpenCommand, leftSlot }: TopbarProps) {
  const { collapsed, toggle } = useSidebarCollapse();
  const { t } = usePanelLang();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[var(--neon-cyan)]/25 to-transparent"
      />
      <div className="relative flex h-full items-center gap-2 px-3 md:gap-3 md:px-5">
        {/* Toggle sidebar (desktop) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              className="hidden size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] md:inline-flex"
              aria-label={
                collapsed ? t("topbar.sidebar.expand") : t("topbar.sidebar.collapse")
              }
            >
              {collapsed ? (
                <PanelLeft className="size-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="size-4" strokeWidth={1.75} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            <span className="flex items-center gap-2">
              {collapsed ? t("topbar.sidebar.expand") : t("topbar.sidebar.collapse")}
              <Kbd>⌘B</Kbd>
            </span>
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {leftSlot}
          <BreadcrumbNav />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <CartIconButton />

          <button
            type="button"
            onClick={onOpenCommand}
            className={cn(
              "group relative hidden h-9 min-w-[200px] items-center gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 text-xs text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--neon-cyan)]/30 hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] md:inline-flex lg:min-w-[260px]",
            )}
            aria-label={t("topbar.search.aria")}
          >
            <Search
              className="size-3.5 transition-colors group-hover:text-[var(--neon-cyan)]"
              strokeWidth={1.75}
            />
            <span className="flex-1 text-left">{t("topbar.search.placeholder")}</span>
            <Kbd>⌘K</Kbd>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <PreviewLangPicker />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
