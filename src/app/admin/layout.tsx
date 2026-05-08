import Link from "next/link";
import {
  ActivitySquare,
  Building2,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { requireAdmin } from "@/lib/session";

const navSections = [
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      scope="admin"
      sidebar={
        <>
          <div className="flex h-14 items-center border-b border-[var(--border-subtle)] px-5">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo variant="mark" className="size-7" />
              <span className="text-sm font-semibold tracking-tight">Ruliz</span>
              <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                Admin
              </span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav sections={navSections} />
          </div>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
