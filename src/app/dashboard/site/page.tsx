import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";

// Comme /dashboard/restaurant : on force le re-fetch pour toujours servir
// la dernière config et pas une version cached après save.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Button } from "@/components/ui/button";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getPublicSite } from "@/server/public/restaurant-site";
import { defaultSiteConfig } from "@/features/restaurant-site/types";
import { SiteEditorForm } from "./site-editor-form";

export const metadata: Metadata = {
  title: "Site vitrine — Ruliz",
};

export default async function SiteEditorPage() {
  const { restaurant } = await getCurrentRestaurant();
  const payload = await getPublicSite(restaurant.id);

  const initialConfig =
    payload?.config ??
    defaultSiteConfig({
      nom: restaurant.nom,
      description: restaurant.description,
    });
  const initialEnabled = payload?.enabled ?? false;

  const restaurantId = restaurant.id.toString();
  const siteUrl = `/site/${restaurantId}`;

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
        description="Une page vitrine en plus de ta carte. Pour communiquer ton concept, ta galerie photos, tes témoignages, tes infos pratiques. Lien direct vers ta carte intégré."
        actions={
          <Button asChild variant="outline" size="sm" disabled={!initialEnabled}>
            <Link
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!initialEnabled}
              className={!initialEnabled ? "pointer-events-none opacity-50" : ""}
            >
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
              Voir mon site
            </Link>
          </Button>
        }
      />

      <SiteEditorForm
        restaurantId={restaurantId}
        initialConfig={initialConfig}
        initialEnabled={initialEnabled}
      />
    </div>
  );
}
