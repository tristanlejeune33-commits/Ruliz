import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { Logo } from "@/components/shared/logo";
import {
  RestaurantSwitcher,
  type RestaurantOption,
} from "@/components/shared/restaurant-switcher";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { SubscriptionBanner } from "@/components/shared/subscription-banner";
import { getActiveRestaurantId } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { requireDashboard } from "@/lib/session";

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

  // Charge le statut de paiement pour afficher le banner si besoin
  const activeRestaurant = activeId
    ? await prisma.restaurant.findUnique({
        where: { id: BigInt(activeId) },
        select: { stripeSubscriptionStatus: true, statut: true },
      })
    : null;

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
            <SidebarNav scope="dashboard" />
          </div>
        </>
      }
      topbarLeftSlot={
        <RestaurantSwitcher restaurants={restaurants} activeId={activeId} />
      }
    >
      {activeRestaurant && (
        <div className="mb-4">
          <SubscriptionBanner
            status={activeRestaurant.stripeSubscriptionStatus}
            restaurantStatut={activeRestaurant.statut}
          />
        </div>
      )}
      {children}
    </AppShell>
  );
}
