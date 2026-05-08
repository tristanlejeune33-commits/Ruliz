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
import { PLANS, type Plan, isAtLeastPlan } from "@/lib/plans";

interface PlanLockProps {
  /** Plan currently active on the restaurant. */
  currentPlan: Plan;
  /** Plan required to unlock this feature. */
  requiredPlan: Plan;
  /** Title shown when locked. */
  title: string;
  /** Description shown when locked. */
  description: string;
  children: React.ReactNode;
}

/**
 * Renders the children only when the current plan is high enough.
 * Otherwise, renders an upgrade card.
 */
export function PlanLock({
  currentPlan,
  requiredPlan,
  title,
  description,
  children,
}: PlanLockProps) {
  if (isAtLeastPlan(currentPlan, requiredPlan)) {
    return <>{children}</>;
  }

  const required = PLANS[requiredPlan];

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
                Passer en {required.name}
              </Link>
            </Button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
