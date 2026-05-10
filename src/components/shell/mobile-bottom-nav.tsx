"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  BarChart3,
  Building2,
  Home,
  type LucideIcon,
  Menu,
  QrCode,
  ScrollText,
  ShieldCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { MobileDrawerPlus } from "./mobile-drawer-plus";

/**
 * MobileBottomNav — barre de navigation principale mobile.
 *
 * Spec : `docs/design-system-mobile.md` §9 Navigation mobile
 *
 *   - 5 items maximum, item central QR/Activité surélevé +8px et plus large
 *   - Hauteur 64px + safe-area-inset-bottom
 *   - Fond glass + ombre vers le haut (--shadow-bottom-nav)
 *   - Item actif : icône colorée + dot 4px sous l'icône
 *   - Item "Plus" ouvre le MobileDrawerPlus (bottom sheet 90vh)
 *
 * Hidden ≥ lg (la sidebar reprend le relais).
 */

interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  /** Item central surélevé. */
  primary?: boolean;
}

const DASHBOARD_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { labelKey: "nav.menu", href: "/dashboard/menu", icon: UtensilsCrossed },
  { labelKey: "nav.qrcodes", href: "/dashboard/qrcodes", icon: QrCode, primary: true },
  { labelKey: "nav.stats", href: "/dashboard/stats", icon: BarChart3 },
];

const ADMIN_ITEMS: NavItem[] = [
  { labelKey: "nav.admin.overview", href: "/admin", icon: ShieldCheck },
  { labelKey: "nav.admin.clients", href: "/admin/clients", icon: Users },
  { labelKey: "nav.admin.activity", href: "/admin/activity", icon: ActivitySquare, primary: true },
  { labelKey: "nav.admin.restaurants", href: "/admin/restaurants", icon: Building2 },
];

const ADMIN_SECTIONS_PLUS = [
  {
    titleKey: "nav.section.donnees",
    items: [
      { labelKey: "nav.admin.logs", href: "/admin/logs", icon: ScrollText },
      { labelKey: "nav.billing", href: "/admin/billing", icon: BarChart3 },
      { labelKey: "nav.admin.factures", href: "/admin/factures", icon: ScrollText },
    ],
  },
];

interface MobileBottomNavProps {
  scope: "admin" | "dashboard";
}

export function MobileBottomNav({ scope }: MobileBottomNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { t } = usePanelLang();

  const items = scope === "admin" ? ADMIN_ITEMS : DASHBOARD_ITEMS;

  const handleTap = () => {
    haptic.light();
  };

  const handleOpenDrawer = () => {
    haptic.light();
    setDrawerOpen(true);
  };

  const isItemActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" &&
      href !== "/admin" &&
      pathname.startsWith(`${href}/`));

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-x-0 bottom-0 lg:hidden",
          "bg-[var(--bg-glass)] backdrop-blur-2xl border-t border-[var(--border-glass)]",
          "shadow-bottom-nav safe-bottom",
        )}
        style={{ zIndex: "var(--z-bottom-nav)" }}
      >
        <ul className="flex h-16 items-stretch justify-around">
          {items.map((item) => {
            const active = isItemActive(item.href);
            return (
              <li key={item.href} className="flex flex-1">
                <NavLink
                  item={item}
                  active={active}
                  onTap={handleTap}
                  label={t(item.labelKey)}
                />
              </li>
            );
          })}
          {/* 5e item : Plus (drawer) */}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={handleOpenDrawer}
              aria-label={t("nav.more")}
              className={cn(
                "tap-48 flex w-full flex-col items-center justify-center gap-1",
                "text-[var(--text-secondary)] transition-colors",
                "active:scale-[0.96]",
                drawerOpen && "text-[var(--text-primary)]",
              )}
            >
              <Menu className="size-6" strokeWidth={1.75} />
              <span className="text-[11px] font-medium leading-none">
                {t("nav.more")}
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileDrawerPlus
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        scope={scope}
        adminExtras={scope === "admin" ? ADMIN_SECTIONS_PLUS : undefined}
      />
    </>
  );
}

function NavLink({
  item,
  active,
  onTap,
  label,
}: {
  item: NavItem;
  active: boolean;
  onTap: () => void;
  label: string;
}) {
  const Icon = item.icon;

  if (item.primary) {
    return (
      <Link
        href={item.href}
        onClick={onTap}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "tap-48 flex w-full flex-col items-center justify-end pb-2",
          "active:scale-[0.96] transition-transform",
        )}
      >
        <span
          className={cn(
            "flex size-[52px] items-center justify-center rounded-full -mt-2",
            "bg-[var(--neon-cyan)] text-[var(--bg-primary)] shadow-fab",
            "transition-transform duration-150 ease-out",
            active && "ring-2 ring-[var(--neon-cyan)] ring-offset-4 ring-offset-[var(--bg-primary)]",
          )}
        >
          <Icon className="size-7" strokeWidth={2} />
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-semibold leading-none",
            active
              ? "text-[var(--neon-cyan)]"
              : "text-[var(--text-secondary)]",
          )}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onTap}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "tap-48 relative flex w-full flex-col items-center justify-center gap-1 px-1",
        "transition-colors",
        "active:scale-[0.96]",
        active
          ? "text-[var(--neon-cyan)]"
          : "text-[var(--text-secondary)]",
      )}
    >
      <Icon className="size-6" strokeWidth={1.75} />
      <span className="text-[11px] font-medium leading-none truncate max-w-full">
        {label}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute bottom-1.5 size-1 rounded-full bg-[var(--neon-cyan)]"
        />
      )}
    </Link>
  );
}
