import { cookies } from "next/headers";
import { AppShell, COLLAPSED_COOKIE } from "@/components/shared/app-shell";
import { ImpersonationBanner } from "@/components/shared/impersonation-banner";
import {
  PanelLangProvider,
  PANEL_LANG_COOKIE,
} from "@/components/shared/panel-lang-context";
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
import { getActingUserId } from "@/lib/impersonation";
import { isSupportedLang, type SupportedLang } from "@/lib/langs";
import { requireDashboard } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireDashboard();

  // Récupère l'user agissant (impersonné si admin SAV, sinon réel)
  const acting = await getActingUserId();
  const userId = acting?.actingUserId ?? null;

  const restaurants: RestaurantOption[] = userId
    ? (
        await prisma.restaurant.findMany({
          where: { userId },
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

  const activeRestaurant = activeId
    ? await prisma.restaurant.findUnique({
        where: { id: BigInt(activeId) },
        select: { stripeSubscriptionStatus: true, statut: true, plan: true },
      })
    : null;

  const userHint = activeRestaurant?.plan
    ? `Plan ${activeRestaurant.plan}`
    : session.user.email;

  const cookieStore = await cookies();
  const collapsedCookie = cookieStore.get(COLLAPSED_COOKIE);
  const defaultCollapsed = collapsedCookie?.value === "1";

  // Lang du panel — lue depuis le cookie ruliz_panel_lang. Défaut FR.
  const langCookie = cookieStore.get(PANEL_LANG_COOKIE)?.value;
  const panelLang: SupportedLang = isSupportedLang(langCookie)
    ? langCookie
    : "fr";

  // Affiché en mode SAV — nom + email du user impersonné
  const impersonatedTargetName =
    acting?.isImpersonating && acting.impersonatedUser
      ? [acting.impersonatedUser.prenom, acting.impersonatedUser.nom]
          .filter(Boolean)
          .join(" ") || acting.impersonatedUser.email
      : null;

  // Affichage user dans la sidebar : si impersonation → on affiche le client
  // (pas l'admin) pour que toute la UI reflète "tu agis en tant que X"
  const sidebarUser =
    acting?.isImpersonating && acting.impersonatedUser
      ? {
          name: impersonatedTargetName,
          email: acting.impersonatedUser.email,
        }
      : { name: session.user.name, email: session.user.email };

  return (
    <PanelLangProvider initialLang={panelLang}>
      {acting?.isImpersonating && acting.impersonatedUser && (
        <ImpersonationBanner
          targetName={impersonatedTargetName ?? acting.impersonatedUser.email}
          targetEmail={acting.impersonatedUser.email}
        />
      )}
      <AppShell
        user={sidebarUser}
        scope="dashboard"
        defaultCollapsed={defaultCollapsed}
        sidebar={
          <>
            <SidebarBrand href="/dashboard" />
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav scope="dashboard" />
            </div>
            <SidebarFooter user={sidebarUser} hint={userHint} />
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
    </PanelLangProvider>
  );
}
