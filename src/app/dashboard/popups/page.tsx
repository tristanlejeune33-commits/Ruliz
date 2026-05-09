import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
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
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Megaphone className="size-3" strokeWidth={1.75} />}>
            Pop-ups
          </HeroEyebrow>
        }
        title="Annonces in-carte"
        description="Affiche un message ponctuel sur la carte : nouvelle offre, événement, soirée DJ. Une pop-up bien placée, ça vend."
      />

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
