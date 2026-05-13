import type { Metadata } from "next";
import { Magra, Roboto } from "next/font/google";

// Magra : font display utilisée pour TOUS les titres (h1, h2, h3, btn-collapsed, tags…).
// C'est la signature du template Ruliz original.
const magra = Magra({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

// Roboto : font body pour les paragraphes (descriptions, ingrédients…).
const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carte Ruliz",
};

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${magra.variable} ${roboto.variable} min-h-screen antialiased`}
      data-public-menu="true"
    >
      {children}
    </div>
  );
}
