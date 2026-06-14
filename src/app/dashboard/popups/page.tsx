import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { PlanLock } from "@/components/shared/plan-lock";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getEffectivePlan } from "@/lib/plan-gate";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { PopupsManager } from "./popups-manager";

export const metadata: Metadata = {
  title: "Pop-ups événements Ruliz",
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
        currentPlan={getEffectivePlan(restaurant)}
        requiredPlan="pro"
        title="Les pop-ups événements sont inclus dans le plan Pro"
        description="Affiche un message ponctuel à tes clients : nouvelle carte, brunch du dimanche, soirée DJ…"
      >
        <PopupsManager
          restaurantId={restaurant.id.toString()}
          // Cast nécessaire le temps que le client Prisma soit régénéré
          // (Windows tient parfois les fichiers .dll → prisma generate échoue
          // silencieusement). Les colonnes joursActifs/heureDebut/heureFin
          // existent en DB et Prisma les retourne au runtime.
          popups={
            serialize(
              popups as unknown as Array<
                (typeof popups)[number] & {
                  joursActifs: number | null;
                  heureDebut: string | null;
                  heureFin: string | null;
                }
              >,
            )
          }
        />
      </PlanLock>
    </div>
  );
}
