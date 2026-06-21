import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Button } from "@/components/ui/button";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { PlanLock } from "@/components/shared/plan-lock";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getFeatureGate } from "@/lib/plan-gate";
import { loadSiteV2 } from "@/server/public/restaurant-site-v2-loader";
import { prisma } from "@/lib/db";
import { SiteV2EditorForm, type ProductPickerOption } from "./site-editor-form";

export const metadata: Metadata = {
  title: "Site vitrine — Ruliz",
};

export default async function SiteEditorPage() {
  const { restaurant } = await getCurrentRestaurant();
  const gate = await getFeatureGate(restaurant, "customDomain");
  // skipRedis pour toujours voir la dernière sauvegarde dans l'éditeur
  const payload = await loadSiteV2(restaurant.id, { skipRedis: true });

  const restaurantId = restaurant.id.toString();
  const config = payload?.config ?? null;
  const enabled = payload?.enabled ?? false;
  const slug = payload?.slug ?? null;
  const plan = restaurant.plan as "freemium" | "pro" | "premium";

  // Liste de TOUS les produits du resto pour le picker "produits en
  // vitrine". On inclut les produits visibles (statut='affiche') groupés
  // par catégorie. Si pas de produit du tout → array vide → le picker
  // affiche un état "Crée des produits dans l'éditeur de carte d'abord".
  const produitsRaw = await prisma.produit.findMany({
    where: {
      categorie: { restaurantId: restaurant.id },
      statut: "affiche",
    },
    select: {
      id: true,
      titre: true,
      imageUrl: true,
      prix: true,
      devise: true,
      position: true,
      categorie: {
        select: { id: true, titre: true, position: true },
      },
    },
    orderBy: [
      { categorie: { position: "asc" } },
      { position: "asc" },
    ],
  });
  const productOptions: ProductPickerOption[] = produitsRaw.map((p) => ({
    id: p.id.toString(),
    titre: p.titre,
    imageUrl: p.imageUrl,
    prix: p.prix !== null ? Number(p.prix) : null,
    devise: p.devise ?? "€",
    categorieTitre: p.categorie.titre,
  }));

  const siteUrl = `/site/${slug ?? restaurantId}`;

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Globe2 className="size-3" strokeWidth={1.75} />}>
            Site vitrine
          </HeroEyebrow>
        }
        title="Ton mini-site web"
        description="Un site éditorial moderne, généré depuis ta carte. Les infos pratiques, ton branding et tes plats sont auto-pullés. Tu n'as qu'à personnaliser le contenu éditorial (à propos, témoignages, galerie)."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={!enabled}
          >
            <Link
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!enabled}
              className={!enabled ? "pointer-events-none opacity-50" : ""}
            >
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
              Voir mon site
            </Link>
          </Button>
        }
      />

      <PlanLock
        allowed={gate.allowed}
        requiredPlan={gate.requiredPlan}
        requiredPlanName={gate.requiredPlanName}
        title="Le site vitrine est inclus dans les offres supérieures"
        description="Un mini-site web éditorial généré depuis ta carte (infos pratiques, branding, plats). Disponible selon ton plan."
      >
        <SiteV2EditorForm
          restaurantId={restaurantId}
          initialConfig={config}
          initialEnabled={enabled}
          initialSlug={slug}
          plan={plan}
          productOptions={productOptions}
        />
      </PlanLock>
    </div>
  );
}
