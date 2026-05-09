"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        {leftSlot}
        <BreadcrumbNav />
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCommand}
          className="ml-auto hidden h-9 min-w-[200px] justify-start gap-2 px-3 text-[var(--text-muted)] md:inline-flex lg:min-w-[260px]"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Recherche rapide…</span>
          <Kbd>⌘K</Kbd>
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <PreviewLangPicker />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
