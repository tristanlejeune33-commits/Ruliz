"use client";

import { useId, useMemo, useState } from "react";
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
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Users,
  X,
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

interface SidebarNavProps {
  scope?: "admin" | "dashboard";
  /** Override optional pour cas custom — sinon on utilise la config selon `scope` */
  sections?: SidebarNavSection[];
  /** Désactiver l'input de filtre (utile pour les mini-sidebars) */
  hideFilter?: boolean;
}

export function SidebarNav({
  scope,
  sections,
  hideFilter = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  // ID unique pour le layoutId Framer — évite les collisions si la nav est
  // rendue plusieurs fois sur la même page (cas rare mais possible).
  const layoutId = useId();
  const [query, setQuery] = useState("");

  const resolved =
    sections ?? (scope === "admin" ? ADMIN_NAV : DASHBOARD_NAV);

  // Filtre live — masque les sections vides après filtre
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return resolved;
    return resolved
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [resolved, query]);

  return (
    <div className="flex flex-col gap-3">
      {/* Filtre live — input compact qui matche les items en temps réel */}
      {!hideFilter && (
        <div className="relative px-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer la nav…"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 py-1.5 pl-9 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-150 focus:border-[var(--accent)]/40 focus:bg-[var(--bg-elevated)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
            aria-label="Filtrer les items du menu"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              aria-label="Effacer le filtre"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      <nav className="flex flex-col gap-5">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
            Rien ne matche « {query} ».
          </div>
        )}
        {filtered.map((section, sectionIdx) => (
          <div key={sectionIdx} className="flex flex-col gap-1">
            {section.title && (
              <div className="mb-1 flex items-center gap-2 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
                  <NavItem
                    key={item.href}
                    item={item}
                    active={active}
                    layoutId={layoutId}
                    query={query}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------

function NavItem({
  item,
  active,
  layoutId,
  query,
}: {
  item: SidebarNavItem;
  active: boolean;
  layoutId: string;
  query: string;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-200",
        active
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {/* Pill animé — bg de l'item actif qui glisse entre items via layoutId Framer Motion */}
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-lg bg-[var(--bg-elevated)] shadow-sm ring-1 ring-[var(--border-subtle)]/60"
          aria-hidden
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover overlay subtil pour les items inactifs */}
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-lg bg-[var(--bg-elevated)]/0 transition-colors duration-200 group-hover:bg-[var(--bg-elevated)]/50"
        />
      )}

      {/* Indicateur d'item actif — barre verticale gauche avec glow */}
      {active && (
        <motion.span
          layoutId={`${layoutId}-bar`}
          aria-hidden
          className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Icône — tile colorée si actif, plate sinon, scale subtil au hover */}
      <span
        className={cn(
          "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-md transition-all duration-200",
          active
            ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25"
            : "text-[var(--text-muted)] group-hover:bg-[var(--bg-card)]/60 group-hover:text-[var(--text-primary)] group-hover:scale-105",
        )}
      >
        <item.icon className="size-3.5" />
      </span>

      <span className="relative z-10 flex-1 truncate">
        {query ? <Highlight text={item.label} match={query} /> : item.label}
      </span>

      {item.badge && (
        <span
          className={cn(
            "relative z-10 rounded-md border px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider transition-colors",
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
}

// ---------------------------------------------------------------------------

/**
 * Surligne la sous-chaîne `match` (case-insensitive) dans `text` avec un
 * background accent. Utilisé quand le filtre nav est actif.
 */
function Highlight({ text, match }: { text: string; match: string }) {
  const m = match.trim();
  if (!m) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(m.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded bg-[var(--accent)]/20 px-0.5 text-[var(--text-primary)]">
        {text.slice(idx, idx + m.length)}
      </span>
      {text.slice(idx + m.length)}
    </>
  );
}
