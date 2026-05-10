"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  setRestaurantPlanByStringId,
  setUserRole,
} from "@/server/admin/actions";

/**
 * Carte "Permissions & Plans" — admin only.
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
            Bascule manuelle des plans — bypasse Stripe. À utiliser pour offrir
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
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text-primary)]">
                      {r.nom}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {r.ville ?? "—"} ·{" "}
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0 font-mono text-[10px] uppercase tracking-wider",
                          PLAN_TONE[r.plan as Plan] ?? PLAN_TONE.freemium,
                        )}
                      >
                        {r.plan}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <PlanButton
                      plan="freemium"
                      current={r.plan}
                      onClick={() => handlePlanChange(r.id, "freemium")}
                      disabled={pending}
                    />
                    <PlanButton
                      plan="pro"
                      current={r.plan}
                      onClick={() => handlePlanChange(r.id, "pro")}
                      disabled={pending}
                    />
                    <PlanButton
                      plan="premium"
                      current={r.plan}
                      onClick={() => handlePlanChange(r.id, "premium")}
                      disabled={pending}
                    />
                  </div>
                </li>
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
