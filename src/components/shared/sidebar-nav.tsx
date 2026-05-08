"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface SidebarNavSection {
  title?: string;
  items: SidebarNavItem[];
}

export function SidebarNav({ sections }: { sections: SidebarNavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section, index) => (
        <div key={index} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                  active
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0",
                    active && "text-[var(--accent)]",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--text-muted)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
