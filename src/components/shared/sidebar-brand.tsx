"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { useSidebarCollapse } from "./sidebar-collapse-context";
import { cn } from "@/lib/utils";

interface SidebarBrandProps {
  href: string;
  pillLabel?: string;
  pillTone?: "cyan" | "violet" | "danger";
}

const TONE_CLASSES: Record<
  NonNullable<SidebarBrandProps["pillTone"]>,
  string
> = {
  cyan: "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  violet:
    "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  danger:
    "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
};

export function SidebarBrand({
  href,
  pillLabel,
  pillTone = "cyan",
}: SidebarBrandProps) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div
      className={cn(
        "relative flex h-14 items-center border-b border-[var(--border-glass)]",
        collapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-2 size-20 rounded-full bg-[var(--neon-cyan)]/15 blur-2xl"
      />
      <Link
        href={href}
        className="relative flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="relative">
          <Logo variant="mark" className="size-7" />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-[var(--neon-cyan)]/30 blur-md"
          />
        </span>
        {!collapsed && (
          <>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
              Ruliz
            </span>
            {pillLabel && (
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider",
                  TONE_CLASSES[pillTone],
                )}
              >
                {pillLabel}
              </span>
            )}
          </>
        )}
      </Link>
      {!collapsed && (
        <span className="relative flex size-2 shrink-0">
          <span
            aria-hidden
            className="pulse-dot absolute inset-0 rounded-full bg-[var(--neon-cyan)]"
          />
          <span
            aria-hidden
            className="relative size-2 rounded-full bg-[var(--neon-cyan)] ring-2 ring-[var(--bg-primary)]"
            title="Serveur en ligne"
          />
        </span>
      )}
    </div>
  );
}
