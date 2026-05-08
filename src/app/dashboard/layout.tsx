import Link from "next/link";
import {
  CreditCard,
  Gauge,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  QrCode,
  Settings,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Logo } from "@/components/shared/logo";
import {
  RestaurantSwitcher,
  type RestaurantOption,
} from "@/components/shared/restaurant-switcher";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { getActiveRestaurantId } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { requireDashboard } from "@/lib/session";

const navSections = [
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireDashboard();

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });

  const restaurants: RestaurantOption[] = authUser?.userId
    ? (
        await prisma.restaurant.findMany({
          where: { userId: authUser.userId },
          select: { id: true, nom: true, ville: true, plan: true },
          orderBy: { createdAt: "asc" },
        })
      ).map((r) => ({
        id: r.id.toString(),
        name: r.nom,
        ville: r.ville,
        plan: r.plan,
      }))
    : [];

  const activeBigId = await getActiveRestaurantId();
  const activeIdFromCookie = activeBigId
    ? restaurants.find((r) => r.id === activeBigId.toString())?.id ?? null
    : null;
  const activeId = activeIdFromCookie ?? restaurants[0]?.id ?? null;

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      scope="dashboard"
      sidebar={
        <>
          <div className="flex h-14 items-center border-b border-[var(--border-subtle)] px-5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo variant="mark" className="size-7" />
              <span className="text-sm font-semibold tracking-tight">Ruliz</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav sections={navSections} />
          </div>
        </>
      }
      topbarLeftSlot={
        <RestaurantSwitcher restaurants={restaurants} activeId={activeId} />
      }
    >
      {children}
    </AppShell>
  );
}
