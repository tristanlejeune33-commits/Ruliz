import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

/**
 * Sitemap dynamique généré au build/revalidate.
 *
 * Inclut :
 *  - les pages marketing publiques (landing, pricing, legal)
 *  - une entrée par mini-site activé (`/site/[slug|id]`)
 *  - une entrée par carte publique active (`/carte/[id]`)
 *
 * Lu par Google Search Console. Régénéré avec ISR 1h pour ne pas hammer
 * la DB à chaque request.
 */

export const revalidate = 3600; // 1h

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/legal/mentions-legales`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/legal/politique-confidentialite`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    await ensureRuntimeSchema();
    type Row = {
      id: bigint;
      siteSlug: string | null;
      siteEnabled: boolean;
      siteUpdatedAt: Date | null;
      updatedAt: Date | null;
    };
    const rows = await prisma.$queryRawUnsafe<Row[]>(`
      SELECT id,
             site_slug         AS "siteSlug",
             site_enabled      AS "siteEnabled",
             site_updated_at   AS "siteUpdatedAt",
             updated_at        AS "updatedAt"
      FROM restaurants
      WHERE statut = 'actif'
      LIMIT 5000
    `);

    const SITE_LANGS = ["fr", "en", "es", "de", "it", "pt", "zh"] as const;

    for (const r of rows) {
      // Carte publique
      dynamicRoutes.push({
        url: `${BASE_URL}/carte/${r.id.toString()}`,
        lastModified: r.updatedAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
      // Site vitrine si activé — on liste l'URL canonique + alternates lang
      // pour signaler à Google les 7 variantes linguistiques.
      if (r.siteEnabled) {
        const path = r.siteSlug ?? r.id.toString();
        const canonicalUrl = `${BASE_URL}/site/${path}`;
        const languages: Record<string, string> = {};
        for (const lng of SITE_LANGS) {
          languages[lng] =
            lng === "fr" ? canonicalUrl : `${canonicalUrl}?lang=${lng}`;
        }
        dynamicRoutes.push({
          url: canonicalUrl,
          lastModified: r.siteUpdatedAt ?? r.updatedAt ?? new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
          alternates: { languages },
        });
      }
    }
  } catch (e) {
    // Si la DB n'est pas joignable, on retourne au moins le sitemap statique
    console.warn("[sitemap] dynamic generation failed:", e);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
