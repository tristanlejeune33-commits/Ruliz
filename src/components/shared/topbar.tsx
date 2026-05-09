"use client";

import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { BreadcrumbNav } from "@/components/shared/breadcrumb-nav";
import { PreviewLangPicker } from "@/components/shared/preview-lang-picker";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";

interface TopbarProps {
  user: { name?: string | null; email: string };
  onOpenCommand?: () => void;
  /** Slot pour insérer un switcher (ex: restaurant) à gauche */
  leftSlot?: React.ReactNode;
}

export function Topbar({ user, onOpenCommand, leftSlot }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/70 backdrop-blur-xl">
      {/* Glow décoratif fin sous la topbar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent"
      />
      <div className="relative flex h-full items-center gap-3 px-4 md:px-6">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {leftSlot}
          <BreadcrumbNav />
        </div>
        {/* Search button — gradient subtil + Kbd alignée */}
        <button
          type="button"
          onClick={onOpenCommand}
          className="group relative ml-auto hidden h-9 min-w-[200px] items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-3 text-xs text-[var(--text-muted)] transition-all duration-200 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-elevated)]/70 hover:text-[var(--text-primary)] md:inline-flex lg:min-w-[260px]"
          aria-label="Rechercher (Cmd+K)"
        >
          <Search className="size-3.5 transition-colors group-hover:text-[var(--accent)]" />
          <span className="flex-1 text-left">Recherche rapide…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <div className="flex items-center gap-1">
          <PreviewLangPicker />
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-[var(--border-subtle)] sm:block" />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
