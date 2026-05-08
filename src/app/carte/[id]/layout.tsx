import type { Metadata } from "next";
import { Fraunces, DM_Serif_Display } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display-editorial",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display-elegant",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carte · Ruliz",
};

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${dmSerif.variable} min-h-screen antialiased`}
      data-public-menu="true"
    >
      {children}
    </div>
  );
}
