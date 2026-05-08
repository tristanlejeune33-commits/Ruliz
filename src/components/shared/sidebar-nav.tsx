"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  Building2,
  CreditCard,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";
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

// ----------------------------------------------------------------------------
// Configs nav par scope (gardées côté Client pour ne PAS croiser la frontière
// RSC avec des références de composants forwardRef — ce qui plante en runtime).
// ----------------------------------------------------------------------------

const DASHBOARD_NAV: SidebarNavSection[] = [
  {
    title: "Mon restaurant",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Éditeur de carte", href: "/dashboard/menu", icon: UtensilsCrossed },
      { label: "QR codes", href: "/dashboard/qrcodes", icon: QrCode },
      { label: "Analyse", href: "/dashboard/stats", icon: Gauge },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { label: "Roulette d'avis", href: "/dashboard/jeu", icon: Sparkles },
      { label: "Pop-ups", href: "/dashboard/popups", icon: Megaphone },
      { label: "SMS marketing", href: "/dashboard/sms", icon: MessageSquare },
    ],
  },
  {
    title: "Gestion",
    items: [
      { label: "Équipe", href: "/dashboard/team", icon: Users },
      { label: "Facturation", href: "/dashboard/billing", icon: CreditCard },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const ADMIN_NAV: SidebarNavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Vue d'ensemble", href: "/admin", icon: ShieldCheck },
      { label: "Activité", href: "/admin/activity", icon: ActivitySquare },
    ],
  },
  {
    title: "Données",
    items: [
      { label: "Clients", href: "/admin/clients", icon: Users },
      { label: "Restaurants", href: "/admin/restaurants", icon: Building2 },
      { label: "Logs", href: "/admin/logs", icon: ScrollText },
    ],
  },
  {
    title: "Système",
    items: [{ label: "Paramètres", href: "/admin/settings", icon: Settings }],
  },
];

export function SidebarNav({
  scope,
  sections,
}: {
  scope?: "admin" | "dashboard";
  /** Override optional pour cas custom — sinon on utilise la config selon `scope` */
  sections?: SidebarNavSection[];
}) {
  const pathname = usePathname();
  const resolved =
    sections ?? (scope === "admin" ? ADMIN_NAV : DASHBOARD_NAV);

  return (
    <nav className="flex flex-col gap-6">
      {resolved.map((section, index) => (
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
