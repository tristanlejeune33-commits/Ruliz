import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <div className="flex items-center gap-2">
          <PlanBadge plan={data.plan as Plan} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/carte/${data.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Voir la carte
            </Link>
          </Button>
        </div>
      </header>

      <RestaurantForm
        restaurant={{
          id: data.id,
          nom: data.nom,
          description: data.description ?? "",
          email: data.email ?? "",
          telephone: data.telephone ?? "",
          adresse: data.adresse ?? "",
          codePostal: data.codePostal ?? "",
          ville: data.ville ?? "",
          pays: data.pays ?? "France",
          deviseDefault: data.deviseDefault ?? "€",
          theme: (data.theme as "light" | "dark") ?? "light",
          fontStyle: (data.fontStyle as "modern" | "editorial" | "elegant") ?? "editorial",
          couleurPrimaire: data.couleurPrimaire ?? "#4870e0",
          couleurSecondaire: data.couleurSecondaire ?? "",
          couleurFond: data.couleurFond ?? "",
          couleurTexteTitre: data.couleurTexteTitre ?? "",
          couleurCategorie: data.couleurCategorie ?? "",
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
