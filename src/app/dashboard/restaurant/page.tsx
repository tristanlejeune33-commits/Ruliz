import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ExternalLink, Globe2, MapPin } from "lucide-react";

// Force le re-fetch à chaque hit pour ne JAMAIS retourner une version cached
// du restaurant. Sans ça, après un save l'auto-save écrit bien en DB mais
// quand l'user revient sur la page, Next.js sert la version cached et
// l'user voit les anciennes valeurs → impression que rien n'a été sauvegardé.
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { Button } from "@/components/ui/button";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { serialize } from "@/lib/serialize";
import { RestaurantForm } from "./restaurant-form";

export const metadata: Metadata = {
  title: "Mon restaurant Ruliz",
};

export default async function RestaurantPage() {
  const { restaurant } = await getCurrentRestaurant();
  const data = serialize(restaurant);

  const ville = data.ville?.trim();
  const pays = data.pays?.trim();
  const localisation = [ville, pays].filter(Boolean).join(", ");

  return (
    <div className="space-y-8">
      <PageHero
        accent="cyan"
        eyebrow={
          <>
            <HeroEyebrow icon={<Building2 className="size-3" />}>
              Mon restaurant
            </HeroEyebrow>
            <PlanBadge plan={data.plan as Plan} />
          </>
        }
        title={data.nom}
        description="Ces infos apparaissent sur la carte publique scannée par tes clients."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/carte/${data.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Voir la carte
            </Link>
          </Button>
        }
        kpis={
          <>
            {localisation && (
              <HeroKpi
                label="Adresse"
                value={
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="size-3.5 text-[var(--text-muted)]" />
                    {localisation}
                  </span>
                }
              />
            )}
            <HeroKpi
              label="Devise"
              value={
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Globe2 className="size-3.5 text-[var(--text-muted)]" />
                  {data.deviseDefault ?? "€"}
                </span>
              }
            />
          </>
        }
      />

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
          // Horaires d'ouverture en texte libre (ajouté tardivement via
          // ensureRuntimeSchema → le type Prisma local peut ne pas connaître
          // la colonne, cast explicite pour rétrocompat)
          horairesOuverture:
            (data as { horairesOuverture?: string }).horairesOuverture ?? "",
          deviseDefault: data.deviseDefault ?? "€",
          langueNative:
            (data.langueNative as
              | "fr"
              | "en"
              | "es"
              | "de"
              | "it"
              | "pt"
              | "zh") ?? "fr",
          // Fuseau horaire IANA — default Europe/Paris (rétrocompat)
          timezone:
            (data as { timezone?: string }).timezone ?? "Europe/Paris",
          // String vide si null en DB (au lieu de forcer la valeur par défaut)
          // → permet à l'user de "vider" un horaire pour signaler qu'il n'a
          // pas ce créneau de service (pas de lunch / pas de happy hour).
          lunchStart: data.lunchStart ?? "",
          lunchEnd: data.lunchEnd ?? "",
          dinnerStart: data.dinnerStart ?? "",
          dinnerEnd: data.dinnerEnd ?? "",
          happyHourStart: data.happyHourStart ?? "",
          happyHourEnd: data.happyHourEnd ?? "",
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
