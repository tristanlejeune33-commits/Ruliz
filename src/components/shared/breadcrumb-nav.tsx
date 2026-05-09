"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumb dynamique qui parse le pathname et affiche la hiérarchie.
 * Ex: /dashboard/menu/import → Dashboard › Menu › Import
 *
 * Les segments sont mappés à un libellé humain via SEGMENT_LABELS.
 */

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  admin: "Admin",
  restaurant: "Mon resto",
  menu: "Carte",
  import: "Import OCR",
  jeu: "Roulette",
  participations: "Participants",
  qrcodes: "QR codes",
  stats: "Statistiques",
  popups: "Pop-ups",
  sms: "SMS",
  team: "Équipe",
  billing: "Facturation",
  settings: "Paramètres",
  clients: "Clients",
  restaurants: "Restaurants",
  onboarding: "Onboarding",
  new: "Nouveau",
};

interface BreadcrumbNavProps {
  /** Préfixe à ignorer dans la décomposition (ex: "/dashboard" pour ne pas afficher Home) */
  hideRoot?: boolean;
}

export function BreadcrumbNav({ hideRoot = false }: BreadcrumbNavProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;
  // Sur la home (/dashboard), on n'affiche rien (redondant avec le titre)
  if (segments.length === 1 && (segments[0] === "dashboard" || segments[0] === "admin")) {
    return null;
  }

  const items = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = SEGMENT_LABELS[seg] ?? humanize(seg);
    return { href, label, isLast: idx === segments.length - 1 };
  });

  return (
    <nav
      aria-label="Fil d'ariane"
      className="hidden items-center gap-1 text-xs text-[var(--text-muted)] md:flex"
    >
      {!hideRoot && (
        <>
          <Link
            href={`/${segments[0]}`}
            className="flex size-6 items-center justify-center rounded transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            aria-label="Accueil"
          >
            <Home className="size-3" />
          </Link>
          <ChevronRight className="size-3 text-[var(--border-subtle)]" />
        </>
      )}
      {items.slice(1).map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          {item.isLast ? (
            <span className="font-medium text-[var(--text-primary)]">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          )}
          {!item.isLast && (
            <ChevronRight className="size-3 text-[var(--border-subtle)]" />
          )}
        </span>
      ))}
    </nav>
  );
}

function humanize(seg: string): string {
  // Si c'est un BigInt-ish (id), affiche "#X"
  if (/^\d+$/.test(seg)) return `#${seg}`;
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}
