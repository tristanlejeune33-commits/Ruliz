"use client";

import * as React from "react";
import { CommandPalette } from "./command-palette";
import { PageTransition } from "./page-transition";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: { name?: string | null; email: string };
  scope: "admin" | "dashboard";
  sidebar: React.ReactNode;
  /** Optional left slot for the topbar (e.g. restaurant switcher). */
  topbarLeftSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  user,
  scope,
  sidebar,
  topbarLeftSlot,
  children,
}: AppShellProps) {
  const [commandOpen, setCommandOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)]">
      {/* Mesh gradient ambient background — donne du caractère sans surcharger */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 size-[40rem] rounded-full bg-[var(--accent)]/5 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 size-[36rem] rounded-full bg-[oklch(0.6_0.25_280)]/4 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[oklch(0.65_0.22_25)]/3 blur-[160px]" />
      </div>

      <div className="relative grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
        {/* Sidebar — borders + subtle shadow on right */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]/70 backdrop-blur-xl md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--border-subtle)] to-transparent"
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
      <CommandPalette scope={scope} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
