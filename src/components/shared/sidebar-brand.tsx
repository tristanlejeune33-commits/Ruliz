"use client";

import Link from "next/link";
import { Logo } from "./logo";

interface SidebarBrandProps {
  href: string;
  /** Petit chip à droite du nom (ex: "Admin") */
  pillLabel?: string;
}

/**
 * Header de la sidebar — logo + nom Ruliz + chip optionnel.
 * Pensé pour avoir un look premium avec un glow accent subtil derrière le logo.
 */
export function SidebarBrand({ href, pillLabel }: SidebarBrandProps) {
  return (
    <div className="relative flex h-14 items-center border-b border-[var(--border-subtle)] px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-4 size-16 rounded-full bg-[var(--accent)]/10 blur-2xl"
      />
      <Link
        href={href}
        className="relative flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="relative">
          <Logo variant="mark" className="size-7" />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-[var(--accent)]/15 blur-md"
          />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
          Ruliz
        </span>
        {pillLabel && (
          <span className="rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/15 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {pillLabel}
          </span>
        )}
      </Link>
    </div>
  );
}
