"use client";

import * as React from "react";
import { CommandPalette } from "./command-palette";
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
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-[var(--bg-primary)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] md:flex">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-col">
        <Topbar
          user={user}
          onOpenCommand={() => setCommandOpen(true)}
          leftSlot={topbarLeftSlot}
        />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
      <CommandPalette scope={scope} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
