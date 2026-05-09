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
      { label: "Facturation", href: "/admin/billing", icon: CreditCard },
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
      {resolved.map((section, sectionIdx) => (
        <div key={sectionIdx} className="flex flex-col gap-1">
          {section.title && (
            <div className="mb-1 flex items-center gap-2 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {section.title}
              </p>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-[var(--border-subtle)] to-transparent"
              />
            </div>
          )}
          <div className="flex flex-col gap-0.5">
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
                    // Base — wrapping container avec hover + transition douce
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                    active
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/50 hover:text-[var(--text-primary)]",
                  )}
                >
                  {/* Indicateur d'item actif — barre verticale gauche avec glow */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]"
                    />
                  )}

                  {/* Icone — tile colorée si actif, plate sinon */}
                  <span
                    className={cn(
                      "relative flex size-7 shrink-0 items-center justify-center rounded-md transition-all duration-200",
                      active
                        ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25"
                        : "text-[var(--text-muted)] group-hover:bg-[var(--bg-card)]/60 group-hover:text-[var(--text-primary)]",
                    )}
                  >
                    <item.icon className="size-3.5" />
                  </span>

                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider transition-colors",
                        active
                          ? "border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-card)]/60 text-[var(--text-muted)]",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
