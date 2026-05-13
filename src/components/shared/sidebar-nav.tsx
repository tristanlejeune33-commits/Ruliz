"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ActivitySquare,
  Building2,
  CreditCard,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
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
import { usePanelLang } from "./panel-lang-context";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  /** Clé i18n de panel-i18n.ts (ex: "nav.dashboard"). */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /**
   * Si true, rend un `<a>` natif au lieu d'un `<Link>` Next.js. Utilisé
   * pour les liens qui pointent vers un Route Handler (et pas une page),
   * où le SPA fetch RSC ne suit pas correctement le redirect 302 et
   * perd les cookies de la response.
   */
  external?: boolean;
}

export interface SidebarNavSection {
  /** Clé i18n du titre de section (ex: "nav.section.principal"). */
  titleKey?: string;
  items: SidebarNavItem[];
}

const DASHBOARD_NAV: SidebarNavSection[] = [
  {
    titleKey: "nav.section.principal",
    items: [
      { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "nav.restaurant", href: "/dashboard/restaurant", icon: Building2 },
      { labelKey: "nav.menu", href: "/dashboard/menu", icon: UtensilsCrossed },
      { labelKey: "nav.qrcodes", href: "/dashboard/qrcodes", icon: QrCode },
    ],
  },
  {
    titleKey: "nav.section.acquisition",
    // Boutique QR fusionnée dans /dashboard/qrcodes — un seul accès au catalogue
    items: [
      { labelKey: "nav.stats", href: "/dashboard/stats", icon: Gauge },
      { labelKey: "nav.jeu", href: "/dashboard/jeu", icon: Sparkles },
      { labelKey: "nav.popups", href: "/dashboard/popups", icon: Megaphone },
      { labelKey: "nav.clients", href: "/dashboard/clients", icon: Users },
      { labelKey: "nav.sms", href: "/dashboard/sms", icon: MessageSquare },
    ],
  },
  {
    titleKey: "nav.section.gestion",
    // Équipe et Facturation sont accessibles via /dashboard/settings (les
    // pages elles-mêmes restent en place pour les liens directs et bookmarks).
    items: [
      { labelKey: "nav.settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const ADMIN_NAV: SidebarNavSection[] = [
  {
    titleKey: "nav.section.pilotage",
    items: [
      { labelKey: "nav.admin.overview", href: "/admin", icon: ShieldCheck },
      { labelKey: "nav.admin.activity", href: "/admin/activity", icon: ActivitySquare },
      { labelKey: "nav.billing", href: "/admin/billing", icon: CreditCard },
      { labelKey: "nav.admin.factures", href: "/admin/factures", icon: ScrollText },
    ],
  },
  {
    titleKey: "nav.section.donnees",
    items: [
      { labelKey: "nav.admin.clients", href: "/admin/clients", icon: Users },
      { labelKey: "nav.admin.restaurants", href: "/admin/restaurants", icon: Building2 },
      { labelKey: "nav.admin.logs", href: "/admin/logs", icon: ScrollText },
      { labelKey: "nav.boutique", href: "/admin/boutique", icon: Package },
    ],
  },
  {
    titleKey: "nav.section.outils",
    items: [
      {
        labelKey: "nav.admin.demo",
        href: "/admin/demo",
        icon: FlaskConical,
        external: true, // Route handler — exige un full page reload
      },
      {
        labelKey: "nav.admin.email_test",
        href: "/admin/email-test",
        icon: Mail,
      },
    ],
  },
  {
    titleKey: "nav.section.systeme",
    items: [{ labelKey: "nav.settings", href: "/admin/settings", icon: Settings }],
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
  const { t } = usePanelLang();

  const resolved =
    sections ?? (scope === "admin" ? ADMIN_NAV : DASHBOARD_NAV);

  return (
    <nav className="flex flex-col gap-6">
      {resolved.map((section, sectionIdx) => (
        <div key={sectionIdx} className="flex flex-col gap-1.5">
          {section.titleKey && !collapsed && (
            <div className="mb-1 flex items-center gap-2 px-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {t(section.titleKey)}
              </p>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-[var(--border-glass)] to-transparent"
              />
            </div>
          )}
          {section.titleKey && collapsed && (
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
  const { t } = usePanelLang();
  const label = t(item.labelKey);
  // Pour les Route Handlers (ex: /admin/demo qui set des cookies et redirect),
  // on doit utiliser <a> natif pour forcer une vraie navigation HTTP. Sinon
  // Next.js fait un fetch RSC qui ne commit ni les cookies ni le redirect.
  const LinkTag = item.external ? "a" : Link;
  const link = (
    <LinkTag
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-[14px] font-semibold transition-colors duration-200",
        collapsed
          ? "size-11 justify-center"
          : "gap-3 px-3 py-2.5",
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
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30"
            : "text-[var(--text-secondary)] group-hover:bg-[var(--bg-glass-hover)] group-hover:text-[var(--text-primary)] group-hover:scale-105",
        )}
      >
        <item.icon className="size-4" strokeWidth={1.75} />
      </span>

      {/* Label + badge — masqué en collapsed */}
      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 truncate tracking-tight">
            {label}
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
    </LinkTag>
  );

  // En mode collapsed, on enrobe d'un Tooltip pour montrer le label au hover
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
