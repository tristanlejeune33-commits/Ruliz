import type { Metadata } from "next";
import { Users } from "lucide-react";
import { HeroEyebrow, HeroKpi, PageHero } from "@/components/shared/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { listClients } from "@/server/dashboard/clients-actions";
import { ClientsManager } from "./clients-manager";

export const metadata: Metadata = {
  title: "Clients Ruliz",
};

export default async function ClientsPage() {
  const { restaurant } = await getCurrentRestaurant();
  const clients = await listClients(restaurant.id.toString());

  const totalManual = clients.filter((c) => c.source === "manual").length;
  const totalRoulette = clients.filter((c) => c.source === "roulette").length;
  const totalWithPhone = clients.filter((c) => !!c.telephone).length;

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Users className="size-3" strokeWidth={1.75} />}>
            Base clients
          </HeroEyebrow>
        }
        title="Tes clients"
        description="Liste de tous les clients qui ont laissé leurs coordonnées via la roulette d'avis OU que tu as ajoutés manuellement. Utilisable pour les campagnes SMS et automatisations."
        kpis={
          <>
            <HeroKpi
              label="Total"
              value={<span className="tabular-nums">{clients.length}</span>}
            />
            <HeroKpi
              label="Manuels"
              value={<span className="tabular-nums">{totalManual}</span>}
            />
            <HeroKpi
              label="Avec téléphone"
              value={<span className="tabular-nums">{totalWithPhone}</span>}
            />
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <ClientsManager
            restaurantId={restaurant.id.toString()}
            initialClients={clients}
          />
        </CardContent>
      </Card>

      {totalRoulette > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          💡 <span className="font-medium">{totalRoulette}</span> client
          {totalRoulette > 1 ? "s ont été collectés" : " a été collecté"}{" "}
          automatiquement via la roulette d&apos;avis. Tu peux aussi en
          ajouter manuellement (anciens clients, contacts du carnet…)
          avec le bouton « Ajouter un client ».
        </p>
      )}
    </div>
  );
}
