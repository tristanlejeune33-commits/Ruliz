import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { after } from "next/server";
import {
  getPublicSiteByIdOrSlug,
  trackSiteView,
} from "@/server/public/restaurant-site";
import { RestaurantSite } from "@/features/restaurant-site/RestaurantSite";

/**
 * Page publique du mini-site restaurant — `/site/[idOrSlug]`.
 *
 * Accepte deux formes :
 *   /site/3                 → ID numérique (toujours valable)
 *   /site/le-tire-bouchon   → slug friendly (préféré pour SEO + partage)
 *
 * Si l'utilisateur arrive via l'ID alors qu'un slug existe → on REDIRECT
 * 308 vers la version slug (canonical URL).
 *
 * Cache : ISR 60s + Redis L3 (cf. restaurant-site.ts). Une publication
 * dashboard invalide les deux via revalidatePath + invalidateSiteCache.
 */
export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await getPublicSiteByIdOrSlug(id);
  if (!payload || !payload.enabled) {
    return { title: "Restaurant non trouvé" };
  }
  const { branding, config, slug } = payload;
  const cityPart = branding.ville ? ` — Restaurant à ${branding.ville}` : "";
  const title = config.seo?.title || `${branding.nom}${cityPart}`;
  const description =
    config.seo?.description ||
    branding.description ||
    `Découvrez ${branding.nom}, notre carte et nos infos pratiques.`;
  const heroImage = config.hero.imageUrl || branding.banniereUrl || undefined;

  // Canonical : on préfère le slug si dispo
  const canonical = slug ? `/site/${slug}` : `/site/${branding.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: branding.nom,
      images: [{ url: `/site/${id}/opengraph-image` }],
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/site/${id}/opengraph-image`],
    },
    other: heroImage ? { "og:image:secure_url": heroImage } : undefined,
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { id } = await params;
  const payload = await getPublicSiteByIdOrSlug(id);
  if (!payload || !payload.enabled) {
    notFound();
  }

  const { branding, config, slug } = payload;

  // Canonical redirect : si l'user arrive sur /site/3 mais qu'un slug existe,
  // redirige vers /site/le-tire-bouchon (308 permanent).
  if (/^\d+$/.test(id) && slug && slug !== id) {
    redirect(`/site/${slug}`);
  }

  // Tracking async — never blocks rendering
  const reqHeaders = await headers();
  after(async () => {
    await trackSiteView({
      restaurantId: BigInt(branding.id),
      userAgent: reqHeaders.get("user-agent"),
      pays: reqHeaders.get("x-vercel-ip-country") ?? null,
      lang:
        reqHeaders
          .get("accept-language")
          ?.split(",")[0]
          ?.split("-")[0]
          ?.toLowerCase() ?? null,
      referer: reqHeaders.get("referer") ?? null,
    });
  });

  // JSON-LD structured data — booste le SEO local Google
  const jsonLd = buildJsonLd(branding, config);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RestaurantSite branding={branding} config={config} />
    </>
  );
}

/**
 * Build le bloc JSON-LD Restaurant.
 * https://schema.org/Restaurant
 * Google utilise ça pour enrichir la SERP avec horaires, étoiles, photo,
 * map, etc.
 */
function buildJsonLd(
  branding: import("@/features/restaurant-site/types").RestaurantSiteBranding,
  config: import("@/features/restaurant-site/types").RestaurantSiteConfig,
) {
  type JsonLd = Record<string, unknown>;
  const ld: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: branding.nom,
    description: branding.description ?? undefined,
    image: config.hero.imageUrl || branding.banniereUrl || undefined,
    url: branding.siteWeb ?? undefined,
  };

  if (branding.adresse || branding.ville) {
    ld.address = {
      "@type": "PostalAddress",
      streetAddress: branding.adresse ?? undefined,
      addressLocality: branding.ville ?? undefined,
      addressCountry: branding.pays ?? undefined,
    };
  }

  if (config.practical?.phone) {
    ld.telephone = config.practical.phone;
  }

  // Reviews → aggregateRating
  const testimonials = config.testimonials ?? [];
  const ratings = testimonials.filter((t) => typeof t.rating === "number");
  if (ratings.length > 0) {
    const avg =
      ratings.reduce((sum, t) => sum + (t.rating ?? 0), 0) / ratings.length;
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount: ratings.length,
    };
    ld.review = testimonials.slice(0, 5).map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.name },
      reviewBody: t.text,
      reviewRating:
        typeof t.rating === "number"
          ? { "@type": "Rating", ratingValue: t.rating }
          : undefined,
    }));
  }

  // Réservation
  if (config.reservation?.url || config.reservation?.phone) {
    ld.acceptsReservations = "True";
  }

  // Réseaux sociaux
  const sameAs = [
    branding.facebookUrl,
    branding.instagramUrl,
    branding.tiktokUrl,
    branding.googleReviewUrl,
  ].filter(Boolean);
  if (sameAs.length > 0) {
    ld.sameAs = sameAs;
  }

  return ld;
}
