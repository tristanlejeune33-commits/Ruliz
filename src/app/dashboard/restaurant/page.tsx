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
  emptyHorairesService,
  isHorairesService,
} from "@/lib/horaires-service";

function emptyHorairesServiceForInit() {
  return emptyHorairesService();
}

function isValidHorairesShape(v: unknown): boolean {
  return isHorairesService(v);
}
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getEffectivePlan } from "@/lib/plan-gate";
import { serialize } from "@/lib/serialize";
import { RestaurantForm } from "./restaurant-form";

export const metadata: Metadata = {
  title: "Mon restaurant Ruliz",
};

export default async function RestaurantPage() {
  const { restaurant } = await getCurrentRestaurant();
  const data = serialize(restaurant);

  // Raw query pour le JSONB horaires_service — Prisma client ne connaît pas
  // cette colonne car elle est ajoutée par ensureRuntimeSchema, pas par
  // schema.prisma. On la lit explicitement pour la passer au form.
  const { prisma } = await import("@/lib/db");
  const { ensureRuntimeSchema } = await import("@/lib/ensure-runtime-schema");
  await ensureRuntimeSchema();
  const hsRows = await prisma.$queryRaw<
    Array<{ horairesService: unknown }>
  >`
    SELECT horaires_service AS "horairesService"
    FROM restaurants
    WHERE id = ${restaurant.id}
    LIMIT 1
  `;
  const horairesServiceRaw = hsRows[0]?.horairesService ?? null;

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
            <PlanBadge plan={getEffectivePlan(restaurant) as Plan} />
          </>
        }
        title={data.nom}
        description="Ces infos apparaissent sur la carte publique scannée par tes clients."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/carte/${data.id}`} target="_blank" rel="noreferrer" prefetch={false}>
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
          // Horaires de service structurés — array 7 jours JSONB ajouté
          // via ensureRuntimeSchema. Si null (legacy resto sans données),
          // on init avec tous les jours fermés et l'utilisateur active.
          horairesService:
            isValidHorairesShape(horairesServiceRaw)
              ? (horairesServiceRaw as import("@/lib/horaires-service").HorairesService)
              : emptyHorairesServiceForInit(),
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
          showMap: (data as { showMap?: boolean }).showMap ?? false,
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
