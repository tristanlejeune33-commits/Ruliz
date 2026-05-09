"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarCollapse } from "./sidebar-collapse-context";
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

const DASHBOARD_NAV: SidebarNavSection[] = [
  {
    title: "Principal",
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

interface SidebarNavProps {
  scope?: "admin" | "dashboard";
  sections?: SidebarNavSection[];
}

export function SidebarNav({ scope, sections }: SidebarNavProps) {
  const pathname = usePathname();
  const layoutId = useId();
  const { collapsed } = useSidebarCollapse();

  const resolved =
    sections ?? (scope === "admin" ? ADMIN_NAV : DASHBOARD_NAV);

  return (
    <nav className="flex flex-col gap-7">
      {resolved.map((section, sectionIdx) => (
        <div key={sectionIdx} className="flex flex-col gap-2">
          {section.title && !collapsed && (
            <div className="mb-1.5 flex items-center gap-2 px-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {section.title}
              </p>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-[var(--border-glass-hover)] to-transparent"
              />
            </div>
          )}
          {section.title && collapsed && (
            <div
              aria-hidden
              className="mx-3 my-1 h-px bg-[var(--border-glass)]"
            />
          )}
          <div
            className={cn(
              "flex flex-col gap-1",
              collapsed && "items-center",
            )}
          >
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/admin" &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  layoutId={layoutId}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavItem({
  item,
  active,
  collapsed,
  layoutId,
}: {
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
  layoutId: string;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-[15px] font-semibold transition-colors duration-200",
        collapsed
          ? "size-11 justify-center"
          : "gap-3 px-3 py-3",
        active
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {/* Pill animé via layoutId Framer Motion — glisse entre items actifs */}
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-xl bg-[var(--bg-glass-strong)] ring-1 ring-[var(--border-glass-hover)] backdrop-blur-md"
          aria-hidden
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover overlay subtil */}
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl bg-[var(--bg-glass)]/0 transition-colors duration-200 group-hover:bg-[var(--bg-glass)]"
        />
      )}

      {/* Barre verticale gauche néon avec glow — non rendue en collapsed */}
      {active && !collapsed && (
        <motion.span
          layoutId={`${layoutId}-bar`}
          aria-hidden
          className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--neon-cyan)] shadow-[0_0_12px_var(--neon-cyan-glow)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Icône — tile plus grande pour plus de présence */}
      <span
        className={cn(
          "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30"
            : "text-[var(--text-secondary)] group-hover:bg-[var(--bg-glass-hover)] group-hover:text-[var(--text-primary)] group-hover:scale-105",
        )}
      >
        <item.icon className="size-[18px]" strokeWidth={1.75} />
      </span>

      {/* Label + badge — masqué en collapsed */}
      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 truncate tracking-tight">
            {item.label}
          </span>
          {item.badge && (
            <span
              className={cn(
                "relative z-10 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
                active
                  ? "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]"
                  : "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  // En mode collapsed, on enrobe d'un Tooltip pour montrer le label au hover
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
