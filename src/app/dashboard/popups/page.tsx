import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanLock } from "@/components/shared/plan-lock";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { PopupsManager } from "./popups-manager";

export const metadata: Metadata = {
  title: "Pop-ups événements · Ruliz",
};

export default async function PopupsPage() {
  const { restaurant } = await getCurrentRestaurant();

  const popups = await prisma.popup.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { id: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="secondary">
          <Megaphone className="size-3" /> Communication
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Pop-ups événements
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Annonce un événement, une promotion ou un lancement directement sur la carte.
        </p>
      </header>

      <PlanLock
        currentPlan={restaurant.plan}
        requiredPlan="pro"
        title="Les pop-ups événements sont inclus dans le plan Pro"
        description="Affiche un message ponctuel à tes clients : nouvelle carte, brunch du dimanche, soirée DJ…"
      >
        <PopupsManager
          restaurantId={restaurant.id.toString()}
          popups={serialize(popups)}
        />
      </PlanLock>
    </div>
  );
}
