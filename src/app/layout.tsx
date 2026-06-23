import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppUrl } from "@/lib/url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruliz Menus digitaux pour restaurants",
  description:
    "Menus digitaux : QR code, traduction automatique en 7 langues, espace pro pour restaurateurs.",
  metadataBase: new URL(getAppUrl()),
  // PWA installable iOS / Android voir src/app/manifest.ts
  manifest: "/manifest.webmanifest",
  applicationName: "Ruliz",
  appleWebApp: {
    capable: true,
    title: "Ruliz",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/brand/logo-mark.png",
    shortcut: "/brand/logo-mark.png",
    apple: "/brand/logo-mark.png",
  },
  // Désactive l'auto-traduction du navigateur (Google Translate) : on gère la
  // traduction nous-mêmes (carte server-side + AutoTranslateWrapper panel).
  // Google Translate réécrit le DOM (balises <font>) → React plante avec
  // "removeChild: node is not a child of this node" (crash page Mon resto).
  other: { google: "notranslate" },
};

/**
 * Viewport mobile-first.
 *
 * - `viewportFit: "cover"` active `env(safe-area-inset-*)` pour les iPhones
 *   avec encoche / Dynamic Island. Indispensable pour les bottom nav, top bar
 *   et modales qui doivent respecter la safe area. (cf. design-system-mobile.md §2)
 * - Pas de `maximumScale` ni `userScalable: false` : on garde le zoom utilisateur
 *   accessible (WCAG AA, jusqu'à 200%).
 * - `themeColor` dual mode : la barre URL mobile prend la teinte du thème actif.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
    { media: "(prefers-color-scheme: light)", color: "#26438a" },
  ],
};

/**
 * Patch anti-crash React ↔ Google Translate.
 *
 * Quand le navigateur traduit la page (Google Translate / extension), il
 * réécrit le DOM (enveloppe le texte dans des <font>), déplaçant des nœuds que
 * React croit toujours à leur place. Au prochain re-render, React appelle
 * removeChild/insertBefore sur un nœud qui n'est plus enfant du parent attendu
 * → "NotFoundError: node is not a child of this node" → page blanche.
 *
 * On rend ces deux méthodes NULL-SAFE : si le nœud n'est pas (plus) enfant du
 * parent, on no-op gracieusement au lieu de throw. Correctif standard et
 * éprouvé. Exécuté avant l'hydratation (script inline en tête de <body>).
 */
const NODE_PATCH = `(function(){if(typeof Node!=="function"||!Node.prototype)return;var r=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c&&c.parentNode!==this){return c;}return r.apply(this,arguments);};var i=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,ref){if(ref&&ref.parentNode!==this){return n;}return i.apply(this,arguments);};})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" translate="no" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: NODE_PATCH }} />
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={["dark", "light"]}
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={150}>
            {children}
            {/* Toaster : position est gérée en interne (mobile = bottom-center
                au-dessus de la BottomNav, desktop = bottom-right) */}
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
