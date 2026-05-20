import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

/**
 * Crée /robots.txt automatiquement à partir de cette définition.
 * On autorise tout sauf le panel admin/dashboard et les endpoints API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/carte/", "/site/", "/pricing", "/legal/"],
        disallow: ["/admin", "/dashboard", "/api", "/onboarding", "/preview/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
