import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type Plan } from "@/lib/plans";

interface PlanLockProps {
  /**
   * La feature est-elle autorisée pour le plan effectif du resto ?
   * Calculé via `getFeatureGate()` (config admin + bypass démo). Quand true,
   * on affiche les enfants ; sinon, la carte d'upgrade.
   */
  allowed: boolean;
  /** Plan le moins cher qui débloque la feature (cible du CTA). */
  requiredPlan: Plan;
  /** Nom affiché de ce plan (depuis la config admin). */
  requiredPlanName: string;
  /** Title shown when locked. */
  title: string;
  /** Description shown when locked. */
  description: string;
  children: React.ReactNode;
}

/**
 * Affiche les enfants seulement si la feature est autorisée par la config du
 * plan effectif. Sinon, une carte d'upgrade. Le verrouillage suit donc la
 * matrice plan × fonctionnalité éditée dans /admin/settings.
 */
export function PlanLock({
  allowed,
  requiredPlan,
  requiredPlanName,
  title,
  description,
  children,
}: PlanLockProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 z-0 opacity-10">{children}</div>
        <div className="relative z-10 flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
            <Lock className="size-5" />
          </div>
          <CardHeader className="p-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 max-w-md">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Button asChild>
              <Link href={`/dashboard/billing?upgrade=${requiredPlan}`}>
                <Sparkles className="size-4" />
                Passer en {requiredPlanName}
              </Link>
            </Button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
