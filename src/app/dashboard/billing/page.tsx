import type { Metadata } from "next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CreditCard, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanBadge, type Plan as UiPlan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { PLANS, type Plan, formatPriceEuro, isAtLeastPlan } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { syncRestaurantSubscription } from "@/server/billing/actions";
import { BillingActions, UpgradeButton } from "./billing-actions";
import { SubscriptionStatusCard } from "./subscription-status-card";

export const metadata: Metadata = {
  title: "Facturation · Ruliz",
};

interface PageProps {
  searchParams: Promise<{
    checkout?: string;
    upgrade?: string;
    feature?: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai gratuit",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
  unpaid: "Impayé",
};

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { restaurant } = await getCurrentRestaurant();

  // Si on revient d'un Checkout réussi, sync immédiatement (le webhook arrive en async).
  if (params.checkout === "success" && restaurant.stripeSubscriptionId) {
    await syncRestaurantSubscription(restaurant.id.toString());
  }

  const currentPlan = PLANS[restaurant.plan];
  const renewLabel = restaurant.stripeCurrentPeriodEnd
    ? format(restaurant.stripeCurrentPeriodEnd, "d MMM yyyy", { locale: fr })
    : null;
  const statusLabel = restaurant.stripeSubscriptionStatus
    ? STATUS_LABELS[restaurant.stripeSubscriptionStatus] ?? restaurant.stripeSubscriptionStatus
    : null;

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="secondary">
          <CreditCard className="size-3" /> Facturation
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Plan & paiement</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Plan associé à <strong>{restaurant.nom}</strong>. Géré via Stripe.
        </p>
      </header>

      {!isStripeConfigured() && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-900">Stripe non configuré</CardTitle>
            <CardDescription className="text-amber-900/80">
              Renseigne <code className="font-mono">STRIPE_SECRET_KEY</code>,{" "}
              <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>, et les{" "}
              <code className="font-mono">STRIPE_*_PRICE_ID</code> dans l&apos;env pour
              activer les paiements.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {params.upgrade && (
        <Card className="border-[var(--accent)]/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 shrink-0 text-[var(--accent)]" />
              <div>
                <CardTitle>
                  Cette fonctionnalité demande {PLANS[params.upgrade as Plan]?.name ?? "un plan supérieur"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Choisis un plan ci-dessous pour la débloquer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Plan actuel — status enriched */}
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

      {/* Plans grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        {(Object.values(PLANS) as (typeof PLANS)[Plan][]).map((p) => {
          const isCurrent = p.id === restaurant.plan;
          const isUpgrade = !isAtLeastPlan(restaurant.plan, p.id);
          return (
            <PlanCard
              key={p.id}
              plan={p}
              currentPlan={restaurant.plan}
              isCurrent={isCurrent}
              isUpgrade={isUpgrade}
              restaurantId={restaurant.id.toString()}
            />
          );
        })}
      </section>
    </div>
  );
}

interface PlanCardProps {
  plan: (typeof PLANS)[Plan];
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
    { key: "iaTranslation", label: "Traduction IA (7 langues)" },
    { key: "advancedStats", label: "Stats avancées" },
    { key: "rouletteGame", label: "Jeu roulette d'avis" },
    { key: "popups", label: "Pop-ups événements" },
    { key: "customDomain", label: "Domaine custom" },
    { key: "smsMarketing", label: "SMS marketing" },
    { key: "removeBranding", label: 'Sans "Propulsé par Ruliz"' },
  ];

  return (
    <Card
      className={
        isCurrent
          ? "border-[var(--accent)]/50 bg-[var(--accent)]/5"
          : plan.highlighted
            ? "border-[var(--accent)]/30"
            : ""
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          {isCurrent && (
            <Badge>
              <Check className="size-3" /> Actuel
            </Badge>
          )}
          {!isCurrent && plan.highlighted && (
            <Badge variant="secondary">Recommandé</Badge>
          )}
        </div>
        <CardDescription className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatPriceEuro(plan.monthlyPriceHT)}
          </span>
          {plan.monthlyPriceHT > 0 && (
            <span className="text-xs text-[var(--text-muted)]">HT / mois</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {featureRows.map((row) => {
            const value = plan.features[row.key];
            const display =
              typeof value === "boolean"
                ? value
                  ? "✓"
                  : "✗"
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
                    : "flex items-center gap-2 text-[var(--text-muted)]"
                }
              >
                {enabled ? (
                  <Check className="size-3.5 shrink-0 text-[var(--accent)]" />
                ) : (
                  <X className="size-3.5 shrink-0 text-[var(--text-muted)]" />
                )}
                <span className="flex-1">{row.label}</span>
                {typeof display !== "string" || (display !== "✓" && display !== "✗") ? (
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {display}
                  </span>
                ) : null}
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
          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Pour redescendre vers {plan.name}, utilise le portail Stripe ci-dessus.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

