"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Crown, Gift, Loader2, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  grantPlanForDays,
  revokeOfferedPlan,
  setRestaurantPlanByStringId,
  setUserRole,
} from "@/server/admin/actions";

/**
 * Carte "Permissions & Plans" · admin only.
 *
 *   1. Toggle rôle de l'utilisateur (client ↔ admin)
 *   2. Pour chaque restaurant : bascule rapide du plan (freemium / pro / premium)
 *
 * Les changements sont instantanés (server action + router.refresh) avec
 * feedback toast. Le bouton est désactivé pendant la transition.
 */

type Role = "client" | "admin";
type Plan = "freemium" | "pro" | "premium";

interface RestaurantSummary {
  id: string;
  nom: string;
  plan: string;
  ville: string | null;
  /** Date d'expiration du plan offert par l'admin (bypass Stripe). ISO. */
  planOffertExpiresAt: string | null;
  /** Date de fin de la période actuelle de l'abonnement Stripe. ISO. */
  stripeCurrentPeriodEnd: string | null;
  /** Status Stripe (active, trialing, past_due, canceled, etc.) */
  stripeSubscriptionStatus: string | null;
}

interface ClientPermissionsProps {
  userId: number;
  userEmail: string;
  userRole: string;
  restaurants: RestaurantSummary[];
}

const PLAN_TONE: Record<Plan, string> = {
  freemium:
    "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)]",
  pro: "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  premium:
    "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
};

export function ClientPermissions({
  userId,
  userEmail,
  userRole,
  restaurants,
}: ClientPermissionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRoleChange = (newRole: Role) => {
    if (newRole === userRole) return;
    startTransition(async () => {
      const res = await setUserRole(userId, newRole);
      if (res.ok) {
        toast.success(
          newRole === "admin"
            ? `${userEmail} promu admin`
            : `${userEmail} rétrogradé en client`,
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handlePlanChange = (restaurantId: string, plan: Plan) => {
    startTransition(async () => {
      const res = await setRestaurantPlanByStringId(restaurantId, plan);
      if (res.ok) {
        toast.success(`Plan basculé en ${plan}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* === RÔLE UTILISATEUR === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--neon-violet)]" />
            Rôle de l&apos;utilisateur
          </CardTitle>
          <CardDescription>
            <strong className="text-[var(--neon-danger)]">⚠️ Attention :</strong>{" "}
            promouvoir en admin donne accès à <strong>toutes</strong> les fiches
            clients, logs et facturation. À utiliser avec prudence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentedControl<Role>
            value={userRole as Role}
            onChange={handleRoleChange}
            options={[
              {
                value: "client",
                icon: <UserIcon strokeWidth={1.75} />,
                label: "Client",
              },
              {
                value: "admin",
                icon: <Crown strokeWidth={1.75} />,
                label: "Admin",
              },
            ]}
            ariaLabel="Rôle de l'utilisateur"
          />
          {pending && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="size-3 animate-spin" />
              Mise à jour…
            </p>
          )}
        </CardContent>
      </Card>

      {/* === PLAN DE CHAQUE RESTAURANT === */}
      <Card>
        <CardHeader>
          <CardTitle>Plans des restaurants</CardTitle>
          <CardDescription>
            Bascule manuelle des plans · bypasse Stripe. À utiliser pour offrir
            un upgrade gratuit, débloquer une démo, ou corriger un sub Stripe
            désynchronisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurants.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              Ce client n&apos;a pas encore de restaurant.
            </p>
          ) : (
            <ul className="space-y-3">
              {restaurants.map((r) => (
                <RestaurantPlanCard
                  key={r.id}
                  restaurant={r}
                  pending={pending}
                  onPlanChange={(plan) => handlePlanChange(r.id, plan)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlanButton({
  plan,
  current,
  onClick,
  disabled,
}: {
  plan: Plan;
  current: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const isActive = plan === current;
  const labels: Record<Plan, string> = {
    freemium: "Free",
    pro: "Pro",
    premium: "Premium",
  };
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled || isActive}
      className={cn(
        "h-8 px-3 text-xs",
        isActive && plan === "premium" && "ring-[var(--neon-violet)]/40",
      )}
    >
      {labels[plan]}
    </Button>
  );
}

/**
 * Carte d'un restaurant dans la liste plans : affiche le plan actuel, la
 * durée restante d'abonnement (Stripe OU plan offert), 3 boutons de
 * bascule rapide, et un formulaire compact "Offrir X jours" qui se
 * déplie au clic.
 */
function RestaurantPlanCard({
  restaurant,
  pending,
  onPlanChange,
}: {
  restaurant: RestaurantSummary;
  pending: boolean;
  onPlanChange: (plan: Plan) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantDays, setGrantDays] = useState<number>(30);
  const [grantPlan, setGrantPlan] = useState<"pro" | "premium">("pro");

  // Calcule la fin d'abonnement la plus tardive : entre Stripe et plan offert
  const stripeEnd = restaurant.stripeCurrentPeriodEnd
    ? new Date(restaurant.stripeCurrentPeriodEnd)
    : null;
  const offerEnd = restaurant.planOffertExpiresAt
    ? new Date(restaurant.planOffertExpiresAt)
    : null;
  const now = new Date();
  const hasActiveOffer = offerEnd && offerEnd > now;
  const hasActiveStripe =
    stripeEnd &&
    stripeEnd > now &&
    restaurant.stripeSubscriptionStatus &&
    ["active", "trialing", "past_due"].includes(
      restaurant.stripeSubscriptionStatus,
    );

  const effectiveEnd = (() => {
    const candidates: Date[] = [];
    if (hasActiveOffer && offerEnd) candidates.push(offerEnd);
    if (hasActiveStripe && stripeEnd) candidates.push(stripeEnd);
    if (candidates.length === 0) return null;
    return new Date(Math.max(...candidates.map((d) => d.getTime())));
  })();

  const daysRemaining = effectiveEnd
    ? Math.ceil((effectiveEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleGrant = () => {
    startTransition(async () => {
      const res = await grantPlanForDays({
        restaurantId: restaurant.id,
        plan: grantPlan,
        days: grantDays,
      });
      if (res.ok) {
        toast.success(
          `🎁 ${grantDays} jour${grantDays > 1 ? "s" : ""} de ${grantPlan} offert${grantDays > 1 ? "s" : ""}`,
        );
        setShowGrantForm(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRevoke = () => {
    if (!confirm("Révoquer le cadeau et repasser en freemium immédiatement ?")) {
      return;
    }
    startTransition(async () => {
      const res = await revokeOfferedPlan(restaurant.id);
      if (res.ok) {
        toast.success("Cadeau révoqué · retour en freemium");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3">
      {/* Ligne haute : nom + plan + durée restante + boutons rapides */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--text-primary)]">
            {restaurant.nom}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-tertiary)]">
            <span>{restaurant.ville ?? "·"}</span>
            <span aria-hidden>·</span>
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0 font-mono text-[10px] uppercase tracking-wider",
                PLAN_TONE[restaurant.plan as Plan] ?? PLAN_TONE.freemium,
              )}
            >
              {restaurant.plan}
            </span>
            {daysRemaining !== null && daysRemaining > 0 && (
              <>
                <span aria-hidden>·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    daysRemaining <= 7
                      ? "text-[var(--neon-danger)]"
                      : daysRemaining <= 30
                        ? "text-[var(--neon-violet)]"
                        : "text-[var(--neon-success)]",
                  )}
                >
                  <Clock className="size-3" strokeWidth={1.75} />
                  {daysRemaining}j restant{daysRemaining > 1 ? "s" : ""}
                  {hasActiveOffer && !hasActiveStripe && (
                    <span className="font-mono text-[10px] opacity-70">
                      (offert)
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <PlanButton
            plan="freemium"
            current={restaurant.plan}
            onClick={() => onPlanChange("freemium")}
            disabled={pending}
          />
          <PlanButton
            plan="pro"
            current={restaurant.plan}
            onClick={() => onPlanChange("pro")}
            disabled={pending}
          />
          <PlanButton
            plan="premium"
            current={restaurant.plan}
            onClick={() => onPlanChange("premium")}
            disabled={pending}
          />
        </div>
      </div>

      {/* Ligne basse : toggle "Offrir des jours" */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
        {!showGrantForm ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGrantForm(true)}
              className="text-xs"
            >
              <Gift className="size-3.5" strokeWidth={1.75} />
              Offrir des jours de pro/premium
            </Button>
            {hasActiveOffer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                disabled={pending}
                className="text-xs text-[var(--neon-danger)] hover:bg-[var(--neon-danger-soft)]"
              >
                <X className="size-3.5" strokeWidth={1.75} />
                Révoquer le cadeau
              </Button>
            )}
          </>
        ) : (
          <div className="flex w-full flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`grant-plan-${restaurant.id}`}
                className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                Plan
              </Label>
              <Select
                value={grantPlan}
                onValueChange={(v) => setGrantPlan(v as "pro" | "premium")}
              >
                <SelectTrigger className="h-9 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`grant-days-${restaurant.id}`}
                className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                Durée (jours)
              </Label>
              <Input
                id={`grant-days-${restaurant.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={730}
                value={grantDays}
                onChange={(e) =>
                  setGrantDays(Number.parseInt(e.target.value || "0", 10))
                }
                className="h-9 w-24 font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleGrant}
              disabled={pending || grantDays < 1}
              className="h-9"
            >
              <Gift className="size-3.5" strokeWidth={1.75} />
              Offrir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGrantForm(false)}
              disabled={pending}
              className="h-9 text-xs"
            >
              Annuler
            </Button>
            <p className="basis-full text-[10px] text-[var(--text-tertiary)]">
              Si une période est déjà active, les jours s&apos;ajoutent à la
              date de fin actuelle.
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
