"use client";

import { useTransition } from "react";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Plan, PLAN_ORDER, planRank } from "@/lib/plans";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/server/billing/actions";

interface UpgradeButtonProps {
  plan: Plan;
  restaurantId: string;
  label: string;
  className?: string;
}

export function UpgradeButton({
  plan,
  restaurantId,
  label,
  className,
}: UpgradeButtonProps) {
  const [pending, startTransition] = useTransition();

  if (plan === "freemium") return null;

  const handle = () => {
    startTransition(async () => {
      const res = await createCheckoutSession({ plan, restaurantId });
      if (res.ok && res.data) {
        window.location.href = res.data.url;
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button onClick={handle} disabled={pending} className={cn(className)}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {label}
    </Button>
  );
}

interface BillingActionsProps {
  currentPlan: Plan;
  hasSubscription: boolean;
  restaurantId: string;
}

export function BillingActions({
  currentPlan,
  hasSubscription,
  restaurantId,
}: BillingActionsProps) {
  const [pending, startTransition] = useTransition();

  const handlePortal = () => {
    startTransition(async () => {
      const res = await createPortalSession();
      if (res.ok && res.data) {
        window.location.href = res.data.url;
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const nextUpgrade: Plan | null = (() => {
    const idx = planRank(currentPlan);
    return PLAN_ORDER[idx + 1] ?? null;
  })();

  const upgradeLabel = nextUpgrade
    ? `Passer en ${nextUpgrade.charAt(0).toUpperCase() + nextUpgrade.slice(1)}`
    : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasSubscription && (
        <Button onClick={handlePortal} variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-3.5" />
          )}
          Gérer mon abonnement
        </Button>
      )}
      {nextUpgrade && (
        <UpgradeButton
          plan={nextUpgrade}
          restaurantId={restaurantId}
          label={upgradeLabel}
        />
      )}
    </div>
  );
}
