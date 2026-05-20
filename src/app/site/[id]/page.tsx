import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicSite } from "@/server/public/restaurant-site";
import { RestaurantSite } from "@/features/restaurant-site/RestaurantSite";

/**
 * Page publique du mini-site restaurant — `/site/[id]`.
 *
 * Cache : ISR 60s. Identique à `/carte/[id]` côté stratégie de cache.
 * Le restaurateur publie la nouvelle version → on attend max 60s + un
 * `revalidatePath` côté action save pour invalider immédiatement.
 */
export const revalidate = 60;
export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadFromParam(id: string) {
  if (!/^\d+$/.test(id)) return null;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return null;
  }
  return getPublicSite(bid);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await loadFromParam(id);
  if (!payload || !payload.enabled) {
    return { title: "Restaurant non trouvé" };
  }
  const { branding, config } = payload;
  const cityPart = branding.ville ? ` — Restaurant à ${branding.ville}` : "";
  const title =
    config.seo?.title || `${branding.nom}${cityPart}`;
  const description =
    config.seo?.description ||
    branding.description ||
    `Découvrez ${branding.nom}, notre carte et nos infos pratiques.`;
  const imageUrl = config.hero.imageUrl || branding.banniereUrl || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { id } = await params;
  const payload = await loadFromParam(id);
  if (!payload || !payload.enabled) {
    notFound();
  }
  return <RestaurantSite branding={payload.branding} config={payload.config} />;
}
