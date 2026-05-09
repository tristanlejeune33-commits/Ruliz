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
        "relative flex h-[68px] items-center border-b border-[var(--border-glass)]",
        collapsed ? "justify-center px-2" : "justify-between gap-2 px-5",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-2 size-28 rounded-full bg-[var(--neon-cyan)]/20 blur-3xl"
      />
      <Link
        href={href}
        className="relative flex items-center gap-3 transition-opacity hover:opacity-85"
      >
        <span className="relative">
          <Logo variant="mark" className="size-10" />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-[var(--neon-cyan)]/40 blur-md"
          />
        </span>
        {!collapsed && (
          <>
            <span className="text-[19px] font-bold tracking-tight text-[var(--text-primary)]">
              Ruliz
            </span>
            {pillLabel && (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
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
        <span className="relative flex size-2.5 shrink-0">
          <span
            aria-hidden
            className="pulse-dot absolute inset-0 rounded-full bg-[var(--neon-cyan)]"
          />
          <span
            aria-hidden
            className="relative size-2.5 rounded-full bg-[var(--neon-cyan)] ring-2 ring-[var(--bg-primary)]"
            title="Serveur en ligne"
          />
        </span>
      )}
    </div>
  );
}
