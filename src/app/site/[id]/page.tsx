import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { loadSiteV2ByIdOrSlug } from "@/server/public/restaurant-site-v2-loader";
import { RestaurantSite } from "@/features/restaurant-site-v2/RestaurantSite";
import { SiteLangShell } from "@/features/restaurant-site-v2/SiteLangShell";
import type { RestaurantConfig } from "@/features/restaurant-site-v2/types";
import { isRealHumanVisit } from "@/lib/is-real-visit";

/**
 * Page publique du mini-site v2 — `/site/[idOrSlug]`.
 *
 * Accepte deux formes :
 *   /site/3                 → ID numérique (toujours valable)
 *   /site/le-tire-bouchon   → slug friendly (préféré pour SEO + partage)
 *
 * Si l'utilisateur arrive via l'ID alors qu'un slug existe → REDIRECT 308
 * vers la version slug (canonical URL).
 *
 * Cache : ISR 120s + Redis L3 (cf. restaurant-site-v2-loader.ts).
 */
export const revalidate = 120;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await loadSiteV2ByIdOrSlug(id);
  if (!payload || !payload.enabled) {
    return { title: "Restaurant non trouvé" };
  }
  const { config, slug, restaurantId } = payload;
  const cityPart = config.city ? ` — Restaurant à ${config.city}` : "";
  const title = `${config.restaurantName}${cityPart}`;
  const description =
    config.tagline ||
    `Découvrez ${config.restaurantName}, notre carte et nos infos pratiques.`;
  const heroImage = config.bannerUrl || config.heroImage || undefined;

  const canonical = slug ? `/site/${slug}` : `/site/${restaurantId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: config.restaurantName,
      images: heroImage ? [{ url: heroImage }] : undefined,
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { id } = await params;
  const payload = await loadSiteV2ByIdOrSlug(id);
  if (!payload || !payload.enabled) {
    notFound();
  }

  const { config, slug, restaurantId } = payload;

  // Canonical redirect : si l'user arrive sur /site/3 mais qu'un slug existe,
  // redirige vers /site/le-tire-bouchon (308 permanent)
  if (/^\d+$/.test(id) && slug && slug !== id) {
    redirect(`/site/${slug}`);
  }

  // Tracking async — never blocks rendering, ET ne compte PAS les
  // prefetch / RSC / bots / crawlers (cf. src/lib/is-real-visit.ts).
  const reqHeaders = await headers();
  const restaurantIdBig = BigInt(restaurantId);
  if (isRealHumanVisit(reqHeaders)) {
    after(async () => {
      try {
        await ensureRuntimeSchema();
        await prisma.$executeRaw`
          INSERT INTO site_views (restaurant_id, user_agent, pays, lang, referer)
          VALUES (
            ${restaurantIdBig},
            ${reqHeaders.get("user-agent")},
            ${reqHeaders.get("x-vercel-ip-country") ?? null},
            ${
              reqHeaders
                .get("accept-language")
                ?.split(",")[0]
                ?.split("-")[0]
                ?.toLowerCase() ?? null
            },
            ${reqHeaders.get("referer") ?? null}
          )
        `;
        await prisma.$executeRaw`
          UPDATE restaurants
          SET site_views_count = site_views_count + 1
          WHERE id = ${restaurantIdBig}
        `;
      } catch (e) {
        console.warn("[site v2] tracking failed:", e);
      }
    });
  }

  // JSON-LD structured data — booste le SEO local Google
  const jsonLd = buildJsonLd(config);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteLangShell>
        <RestaurantSite config={config} />
      </SiteLangShell>
    </>
  );
}

/**
 * Build le bloc JSON-LD Restaurant (schema.org).
 * Google utilise ça pour enrichir la SERP avec horaires, étoiles, photo, map.
 */
function buildJsonLd(config: RestaurantConfig) {
  type JsonLd = Record<string, unknown>;
  const ld: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.restaurantName,
    description: config.tagline,
    image: config.bannerUrl || config.heroImage || undefined,
  };

  if (config.practical.address) {
    ld.address = {
      "@type": "PostalAddress",
      streetAddress: config.practical.address,
      addressLocality: config.city,
    };
  }
  if (config.practical.phone) {
    ld.telephone = config.practical.phone;
  }
  if (config.practical.email) {
    ld.email = config.practical.email;
  }

  // Aggregate rating depuis les testimonials manuels
  const ratings = config.testimonials?.filter(
    (t) => typeof t.rating === "number",
  ) ?? [];
  if (ratings.length > 0) {
    const avg = ratings.reduce((sum, t) => sum + t.rating, 0) / ratings.length;
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount: ratings.length,
    };
  }

  if (config.reservationUrl) {
    ld.acceptsReservations = "True";
  }

  // openingHours en format Schema.org : "Mo-Sa 12:00-22:00"
  // (on n'extrait pas systématiquement — Google accepte le bloc même sans)

  const sameAs = [
    config.socials.instagram
      ? `https://instagram.com/${config.socials.instagram.replace(/^@/, "")}`
      : null,
    config.socials.facebook
      ? `https://facebook.com/${config.socials.facebook}`
      : null,
    config.socials.tiktok
      ? `https://tiktok.com/@${config.socials.tiktok.replace(/^@/, "")}`
      : null,
  ].filter(Boolean);
  if (sameAs.length > 0) {
    ld.sameAs = sameAs;
  }

  return ld;
}
