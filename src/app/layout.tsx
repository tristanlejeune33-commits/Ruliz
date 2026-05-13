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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
