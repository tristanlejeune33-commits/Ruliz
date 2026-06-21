import type { Metadata } from "next";
import { Check, CreditCard, Sparkles, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { PlanBadge, type Plan as UiPlan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getEffectivePlan } from "@/lib/plan-gate";
import {
  type Plan,
  type PlanConfig,
  formatPriceEuro,
  isAtLeastPlan,
} from "@/lib/plans";
import { getPlanConfig } from "@/lib/plan-config";
import { isStripeConfigured } from "@/lib/stripe";
import { syncRestaurantSubscription } from "@/server/billing/actions";
import { BillingActions, UpgradeButton } from "./billing-actions";
import { SubscriptionStatusCard } from "./subscription-status-card";

export const metadata: Metadata = {
  title: "Facturation Ruliz",
};

interface PageProps {
  searchParams: Promise<{
    checkout?: string;
    upgrade?: string;
    feature?: string;
  }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { restaurant } = await getCurrentRestaurant();
  const planConfig = await getPlanConfig();

  // Si on revient d'un Checkout réussi, sync immédiatement (le webhook arrive en async).
  if (params.checkout === "success" && restaurant.stripeSubscriptionId) {
    await syncRestaurantSubscription(restaurant.id.toString());
  }

  return (
    <div className="space-y-8">
      <PageHero
        accent="cyan"
        eyebrow={
          <>
            <HeroEyebrow icon={<CreditCard className="size-3" strokeWidth={1.75} />}>
              Facturation
            </HeroEyebrow>
            <PlanBadge plan={getEffectivePlan(restaurant) as UiPlan} />
          </>
        }
        title="Plan & paiement"
        description={
          <>
            Plan associé à{" "}
            <strong className="text-[var(--text-primary)]">{restaurant.nom}</strong>.
            Géré via Stripe résiliation et changement à tout moment.
          </>
        }
      />

      {!isStripeConfigured() && (
        <Card className="border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)]">
          <CardHeader>
            <CardTitle className="text-[var(--neon-violet)]">
              Stripe non configuré
            </CardTitle>
            <CardDescription>
              Renseigne <code className="font-mono">STRIPE_SECRET_KEY</code>,{" "}
              <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>, et les{" "}
              <code className="font-mono">STRIPE_*_PRICE_ID</code> dans l&apos;env pour
              activer les paiements.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {params.upgrade && (
        <Card className="border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan-soft)]">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Sparkles
                className="size-5 shrink-0 text-[var(--neon-cyan)]"
                strokeWidth={1.75}
              />
              <div>
                <CardTitle>
                  Cette fonctionnalité demande {planConfig[params.upgrade as Plan]?.name ?? "un plan supérieur"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Choisis un plan ci-dessous pour la débloquer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Plan actuel status enriched */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <SubscriptionStatusCard
          plan={restaurant.plan as Plan}
          status={restaurant.stripeSubscriptionStatus}
          currentPeriodEnd={restaurant.stripeCurrentPeriodEnd}
          hasSubscription={!!restaurant.stripeSubscriptionId}
        />
        <div className="flex items-start lg:pt-3">
          <BillingActions
            currentPlan={restaurant.plan}
            hasSubscription={!!restaurant.stripeSubscriptionId}
            restaurantId={restaurant.id.toString()}
          />
        </div>
      </div>

      {/* Plans :
          - Mobile : scroll-snap horizontal (1 plan = 1 écran swipeable, peek
            de 24px sur la droite pour suggérer l'affordance)
          - Desktop : grille 3 colonnes classique */}
      <section
        className={[
          "scroll-snap-x no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2",
          "lg:-mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0",
        ].join(" ")}
      >
        {(Object.values(planConfig) as PlanConfig[]).map((p) => {
          const isCurrent = p.id === restaurant.plan;
          const isUpgrade = !isAtLeastPlan(restaurant.plan, p.id);
          return (
            <div
              key={p.id}
              className="snap-center w-[calc(100%-32px)] shrink-0 lg:w-auto lg:shrink"
            >
              <PlanCard
                plan={p}
                currentPlan={restaurant.plan}
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                restaurantId={restaurant.id.toString()}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}

interface PlanCardProps {
  plan: PlanConfig;
  currentPlan: Plan;
  isCurrent: boolean;
  isUpgrade: boolean;
  restaurantId: string;
}

function PlanCard({ plan, isCurrent, isUpgrade, restaurantId }: PlanCardProps) {
  const featureRows: Array<{ key: keyof typeof plan.features; label: string }> = [
    { key: "maxRestaurants", label: "Restaurants" },
    { key: "maxQrcodes", label: "QR codes" },
    { key: "maxProduits", label: "Produits" },
    { key: "iaTranslation", label: "Traduction automatique (7 langues)" },
    { key: "advancedStats", label: "Stats avancées" },
    { key: "rouletteGame", label: "Jeu roulette d'avis" },
    { key: "popups", label: "Pop-ups événements" },
    { key: "clientsPage", label: "Page Clients" },
    { key: "customDomain", label: "Site vitrine" },
    { key: "smsMarketing", label: "SMS marketing" },
    { key: "removeBranding", label: 'Sans "Propulsé par Ruliz"' },
  ];

  return (
    <Card
      className={
        isCurrent
          ? "relative overflow-hidden border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan-soft)] shadow-[0_0_36px_rgba(0,229,255,0.15)]"
          : plan.highlighted
            ? "relative overflow-hidden border-[var(--neon-violet)]/30 lift-hover"
            : "relative overflow-hidden lift-hover"
      }
    >
      {/* Glow décoratif sur le plan actuel ou highlighted */}
      {(isCurrent || plan.highlighted) && (
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-20 -top-20 size-56 rounded-full blur-3xl ${
            isCurrent
              ? "bg-[var(--neon-cyan)]/15"
              : "bg-[var(--neon-violet)]/12"
          }`}
        />
      )}
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--neon-cyan)]">
              <Check className="size-3" strokeWidth={2} /> Actuel
            </span>
          )}
          {!isCurrent && plan.highlighted && (
            <span className="inline-flex items-center rounded-md border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--neon-violet)]">
              Recommandé
            </span>
          )}
        </div>
        <CardDescription className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatPriceEuro(plan.monthlyPriceHT)}
          </span>
          {plan.monthlyPriceHT > 0 && (
            <span className="text-xs text-[var(--text-tertiary)]">HT / mois</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <ul className="space-y-2 text-sm">
          {featureRows.map((row) => {
            const value = plan.features[row.key];
            const display =
              typeof value === "boolean"
                ? null
                : value === null
                  ? "Illimité"
                  : value;
            const enabled = typeof value === "boolean" ? value : value !== 0;
            return (
              <li
                key={row.key}
                className={
                  enabled
                    ? "flex items-center gap-2 text-[var(--text-primary)]"
                    : "flex items-center gap-2 text-[var(--text-tertiary)]"
                }
              >
                {enabled ? (
                  <Check
                    className="size-3.5 shrink-0 text-[var(--neon-success)]"
                    strokeWidth={2}
                  />
                ) : (
                  <X
                    className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                    strokeWidth={1.75}
                  />
                )}
                <span className="flex-1">{row.label}</span>
                {display !== null && (
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {display}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {isUpgrade && plan.id !== "freemium" && (
          <UpgradeButton
            plan={plan.id}
            restaurantId={restaurantId}
            label={plan.cta}
            className="mt-6 w-full"
          />
        )}
        {!isUpgrade && !isCurrent && (
          <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
            Pour redescendre vers {plan.name}, utilise le portail Stripe ci-dessus.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

