import type { MetadataRoute } from "next";

/**
 * PWA Manifest — installable iOS/Android, splash dark cohérent design system.
 *
 * Spec : `docs/design-system-mobile.md` §11 PWA installable
 *
 * Une fois servi à `/manifest.webmanifest`, le navigateur permet à l'utilisateur
 * d'ajouter Ruliz à son écran d'accueil. L'app s'ouvre alors en `standalone`
 * (sans la barre URL), avec un splash screen utilisant les couleurs ci-dessous.
 *
 * iOS Safari ignore certains champs (icons → utilise apple-touch-icon dans
 * <head>, theme_color → utilise meta name="theme-color"). On a déjà `themeColor`
 * dans `viewport` (layout.tsx), Next.js synthétise les balises pour iOS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruliz — Menus digitaux",
    short_name: "Ruliz",
    description:
      "SaaS de menus digitaux : QR code, traduction IA en 7 langues, dashboard pro pour restaurateurs.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070b14",
    theme_color: "#070b14",
    categories: ["business", "food", "productivity"],
    lang: "fr",
    icons: [
      {
        src: "/brand/logo-mark.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/logo-mark-light.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Éditeur de carte",
        short_name: "Carte",
        description: "Édite ta carte digitale en quelques tap",
        url: "/dashboard/menu",
        icons: [{ src: "/brand/logo-mark.png", sizes: "96x96" }],
      },
      {
        name: "QR codes",
        short_name: "QR",
        description: "Génère et imprime tes QR codes",
        url: "/dashboard/qrcodes",
        icons: [{ src: "/brand/logo-mark.png", sizes: "96x96" }],
      },
      {
        name: "Stats",
        short_name: "Stats",
        description: "Suivi des scans et clics",
        url: "/dashboard/stats",
        icons: [{ src: "/brand/logo-mark.png", sizes: "96x96" }],
      },
    ],
  };
}
