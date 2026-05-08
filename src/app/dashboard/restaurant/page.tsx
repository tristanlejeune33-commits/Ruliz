import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { serialize } from "@/lib/serialize";
import { RestaurantForm } from "./restaurant-form";

export const metadata: Metadata = {
  title: "Mon restaurant · Ruliz",
};

export default async function RestaurantPage() {
  const { restaurant } = await getCurrentRestaurant();
  const data = serialize(restaurant);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">
            <Building2 className="size-3" /> Restaurant
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.nom}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Ces infos apparaissent sur la carte publique scannée par tes clients.
          </p>
        </div>
        <PlanBadge plan={data.plan as Plan} />
      </header>

      <RestaurantForm
        restaurant={{
          id: data.id,
          nom: data.nom,
          email: data.email ?? "",
          telephone: data.telephone ?? "",
          adresse: data.adresse ?? "",
          codePostal: data.codePostal ?? "",
          ville: data.ville ?? "",
          pays: data.pays ?? "France",
          couleurPrimaire: data.couleurPrimaire ?? "#4870e0",
          couleurSecondaire: data.couleurSecondaire ?? "",
          facebookUrl: data.facebookUrl ?? "",
          instagramUrl: data.instagramUrl ?? "",
          tiktokUrl: data.tiktokUrl ?? "",
          siteWeb: data.siteWeb ?? "",
          googleReviewUrl: data.googleReviewUrl ?? "",
          logoUrl: data.logoUrl ?? "",
          banniereUrl: data.banniereUrl ?? "",
        }}
      />
    </div>
  );
}
