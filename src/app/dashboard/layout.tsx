import { cookies } from "next/headers";
import { AppShell, COLLAPSED_COOKIE } from "@/components/shared/app-shell";

// Force dynamic rendering pour éviter toute mise en cache HTML/RSC entre
// users différents l'auth est cookie-based donc chaque request a son
// propre user, on doit refetch côté serveur à chaque navigation.
export const dynamic = "force-dynamic";
import { AdminDemoBanner } from "@/components/shared/admin-demo-banner";
import { ImpersonationBanner } from "@/components/shared/impersonation-banner";
import { AutoTranslateWrapper } from "@/components/shared/auto-translate-wrapper";
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
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { OnboardingBubble } from "@/features/onboarding/onboarding-bubble";
import { getOnboardingState } from "@/server/dashboard/onboarding-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garantit que toutes les colonnes/tables ajoutées tardivement existent
  // en DB avant que Prisma ne les sélectionne. No-op après le 1er call.
  await ensureRuntimeSchema();

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

  // Garde-fou : si la colonne planOffertExpiresAt manque (migration pas
  // appliquée), on retombe sur une query plus simple sans ce champ pour
  // ne JAMAIS casser l'accès au dashboard. C'est ce qui provoquait l'erreur
  // "server-side exception" sur les nouveaux comptes (où la création du
  // 1er resto venait d'écrire dans cette colonne et la 1ère relecture
  // crashait si la migration n'avait pas tourné).
  let activeRestaurant: {
    stripeSubscriptionStatus: string | null;
    statut: string;
    plan: string;
    planOffertExpiresAt: Date | null;
  } | null = null;
  if (activeId) {
    try {
      activeRestaurant = (await prisma.restaurant.findUnique({
        where: { id: BigInt(activeId) },
        select: {
          stripeSubscriptionStatus: true,
          statut: true,
          plan: true,
          planOffertExpiresAt: true,
        } as never,
      })) as unknown as typeof activeRestaurant;
    } catch (err) {
      console.warn(
        "[dashboard] activeRestaurant query failed, retrying without planOffertExpiresAt:",
        err,
      );
      try {
        const fallback = await prisma.restaurant.findUnique({
          where: { id: BigInt(activeId) },
          select: {
            stripeSubscriptionStatus: true,
            statut: true,
            plan: true,
          },
        });
        activeRestaurant = fallback
          ? { ...fallback, planOffertExpiresAt: null }
          : null;
      } catch (err2) {
        console.error("[dashboard] activeRestaurant fallback also failed:", err2);
        activeRestaurant = null;
      }
    }
  }

  const userHint = activeRestaurant?.plan
    ? `Plan ${activeRestaurant.plan}`
    : session.user.email;

  const cookieStore = await cookies();
  const collapsedCookie = cookieStore.get(COLLAPSED_COOKIE);
  const defaultCollapsed = collapsedCookie?.value === "1";

  // === Onboarding tour ===
  // Affiche la bulle si :
  //  - L'user a un resto (sinon il est sur /dashboard/onboarding pour le créer)
  //  - Le tour n'est ni complété ni skippé
  //  - La migration DB est appliquée (sinon getOnboardingState retourne null)
  // Double try/catch : getOnboardingState gère déjà le P2022, mais on garde
  // un filet de sécurité ici au cas où une exception remonterait il ne faut
  // JAMAIS qu'un bug onboarding casse l'accès au dashboard.
  let onboardingState: Awaited<ReturnType<typeof getOnboardingState>> = null;
  if (restaurants.length > 0) {
    try {
      onboardingState = await getOnboardingState();
    } catch (err) {
      console.warn("[onboarding] state fetch failed, bubble disabled:", err);
      onboardingState = null;
    }
  }
  const showOnboarding =
    onboardingState !== null &&
    !onboardingState.completed &&
    !onboardingState.skipped &&
    !acting?.isImpersonating; // pas de tour en mode SAV admin

  // Lang du panel lue depuis le cookie ruliz_panel_lang. Défaut FR.
  const langCookie = cookieStore.get(PANEL_LANG_COOKIE)?.value;
  const panelLang: SupportedLang = isSupportedLang(langCookie)
    ? langCookie
    : "fr";

  // Affiché en mode SAV nom + email du user impersonné
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
     <AutoTranslateWrapper>
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
        activeRestaurantId={activeId}
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
        <AdminDemoBanner />
        {activeRestaurant && (
          <div className="mb-4">
            <SubscriptionBanner
              status={activeRestaurant.stripeSubscriptionStatus}
              restaurantStatut={activeRestaurant.statut}
              currentPlan={activeRestaurant.plan}
              trialExpiresAt={activeRestaurant.planOffertExpiresAt}
              hasStripeSubscription={
                !!activeRestaurant.stripeSubscriptionStatus &&
                ["active", "trialing"].includes(
                  activeRestaurant.stripeSubscriptionStatus,
                )
              }
            />
          </div>
        )}
        {children}
      </AppShell>
      {showOnboarding && onboardingState && (
        <OnboardingBubble initialStep={onboardingState.step} />
      )}
     </AutoTranslateWrapper>
    </PanelLangProvider>
  );
}
