import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Button } from "@/components/ui/button";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { loadSiteV2 } from "@/server/public/restaurant-site-v2-loader";
import { SiteV2EditorForm } from "./site-editor-form";

export const metadata: Metadata = {
  title: "Site vitrine — Ruliz",
};

export default async function SiteEditorPage() {
  const { restaurant } = await getCurrentRestaurant();
  // skipRedis pour toujours voir la dernière sauvegarde dans l'éditeur
  const payload = await loadSiteV2(restaurant.id, { skipRedis: true });

  const restaurantId = restaurant.id.toString();
  const config = payload?.config ?? null;
  const enabled = payload?.enabled ?? false;
  const slug = payload?.slug ?? null;
  const plan = restaurant.plan as "freemium" | "pro" | "premium";

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

      <SiteV2EditorForm
        restaurantId={restaurantId}
        initialConfig={config}
        initialEnabled={enabled}
        initialSlug={slug}
        plan={plan}
      />
    </div>
  );
}
