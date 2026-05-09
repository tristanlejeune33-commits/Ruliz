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
      { label: "Mon resto", href: "/dashboard/restaurant", icon: Building2 },
      { label: "Éditeur de carte", href: "/dashboard/menu", icon: UtensilsCrossed },
      { label: "QR codes", href: "/dashboard/qrcodes", icon: QrCode },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { label: "Statistiques", href: "/dashboard/stats", icon: Gauge },
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
    <nav className="flex flex-col gap-5">
      {resolved.map((section, index) => (
        <div key={index} className="flex flex-col gap-0.5">
          {section.title && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
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
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
                  active
                    ? "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:translate-x-0.5 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]",
                )}
              >
                {/* Indicateur visuel d'item actif (barre verticale gauche) */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-x-1.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                    aria-hidden
                  />
                )}
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
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
