"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

interface SidebarBrandProps {
  href: string;
  /** Petit chip à droite du nom (ex: "Admin" ou "v2") */
  pillLabel?: string;
  pillTone?: "accent" | "danger";
}

/**
 * Header de la sidebar — logo + nom Ruliz + chip optionnel.
 * Glow accent subtil derrière le logo pour donner du caractère sans surcharger.
 */
export function SidebarBrand({
  href,
  pillLabel,
  pillTone = "accent",
}: SidebarBrandProps) {
  return (
    <div className="relative flex h-14 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4">
      {/* Glow accent subtil derrière le logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-2 size-20 rounded-full bg-[var(--accent)]/12 blur-2xl"
      />
      <Link
        href={href}
        className="relative flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="relative">
          <Logo variant="mark" className="size-7" />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-[var(--accent)]/20 blur-md"
          />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
          Ruliz
        </span>
        {pillLabel && (
          <span
            className={cn(
              "rounded-md border px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider",
              pillTone === "accent"
                ? "border-[var(--accent)]/25 bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
            )}
          >
            {pillLabel}
          </span>
        )}
      </Link>
      {/* Status dot — petit indicateur "live" qui pulse */}
      <span className="relative flex size-2 shrink-0">
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.7_0.18_145)]/60"
        />
        <span
          aria-hidden
          className="relative size-2 rounded-full bg-[oklch(0.7_0.18_145)] ring-2 ring-[var(--bg-primary)]"
          title="Serveur en ligne"
        />
      </span>
    </div>
  );
}
