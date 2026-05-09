import { cookies } from "next/headers";
import { AppShell, COLLAPSED_COOKIE } from "@/components/shared/app-shell";
import {
  RestaurantSwitcher,
  type RestaurantOption,
} from "@/components/shared/restaurant-switcher";
import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFooter } from "@/components/shared/sidebar-footer";
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
        select: { stripeSubscriptionStatus: true, statut: true, plan: true },
      })
    : null;

  const userHint = activeRestaurant?.plan
    ? `Plan ${activeRestaurant.plan}`
    : session.user.email;

  // Lit le cookie pour SSR cohérent (pas de flash de layout au refresh)
  const cookieStore = await cookies();
  const collapsedCookie = cookieStore.get(COLLAPSED_COOKIE);
  const defaultCollapsed = collapsedCookie?.value === "1";

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      scope="dashboard"
      defaultCollapsed={defaultCollapsed}
      sidebar={({ collapsed }) => (
        <>
          <SidebarBrand href="/dashboard" collapsed={collapsed} />
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav scope="dashboard" collapsed={collapsed} />
          </div>
          <SidebarFooter
            user={{ name: session.user.name, email: session.user.email }}
            hint={userHint}
            collapsed={collapsed}
          />
        </>
      )}
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
