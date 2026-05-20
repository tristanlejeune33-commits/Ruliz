/**
 * next/font/google loaders — preload conditionnel selon le preset typo.
 *
 * On charge les 7 fonts au build (gratuit en termes de bandwidth grâce au
 * self-hosting next/font), mais on n'ATTACHE au DOM via CSS variable que
 * celles du preset choisi par le resto.
 *
 * Mapping :
 *   editorial → Instrument Serif (display, italic) + Hanken Grotesk (body) + JetBrains Mono
 *   modern    → Geist (display) + Geist (body) + Geist Mono
 *   classic   → EB Garamond (display, italic) + DM Sans (body) + JetBrains Mono
 */

import {
  DM_Sans,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";
import type { TypographyPreset } from "../types";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-instrument-serif",
});

const hankenGrotesk = Hanken_Grotesk({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-hanken",
});

const geistSans = Geist({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-geist",
});

const geistMono = Geist_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-geist-mono",
});

const ebGaramond = EB_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-eb-garamond",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--rs2-font-jetbrains",
});

/**
 * Retourne la className combinée pour les fonts du preset + un objet
 * `style` qui mappe les CSS vars sur les bonnes fonts. Le résultat est
 * appliqué sur la racine .rs2-root.
 *
 * Pourquoi ne pas tout précharger : performance + bandwidth (sur une page
 * publique mobile 4G chaque KB compte). Les fonts non utilisées par le
 * preset choisi ne sont jamais demandées.
 */
export function getFontsForPreset(preset: TypographyPreset): {
  className: string;
  style: React.CSSProperties;
} {
  switch (preset) {
    case "editorial":
      return {
        className: [
          instrumentSerif.variable,
          hankenGrotesk.variable,
          jetbrainsMono.variable,
        ].join(" "),
        style: {
          // @ts-expect-error CSS custom properties
          "--rs2-font-display": `var(--rs2-font-instrument-serif), Georgia, serif`,
          "--rs2-font-body": `var(--rs2-font-hanken), system-ui, sans-serif`,
          "--rs2-font-mono": `var(--rs2-font-jetbrains), ui-monospace, monospace`,
        },
      };
    case "modern":
      return {
        className: [geistSans.variable, geistMono.variable].join(" "),
        style: {
          // @ts-expect-error CSS custom properties
          "--rs2-font-display": `var(--rs2-font-geist), system-ui, sans-serif`,
          "--rs2-font-body": `var(--rs2-font-geist), system-ui, sans-serif`,
          "--rs2-font-mono": `var(--rs2-font-geist-mono), ui-monospace, monospace`,
        },
      };
    case "classic":
      return {
        className: [
          ebGaramond.variable,
          dmSans.variable,
          jetbrainsMono.variable,
        ].join(" "),
        style: {
          // @ts-expect-error CSS custom properties
          "--rs2-font-display": `var(--rs2-font-eb-garamond), Georgia, serif`,
          "--rs2-font-body": `var(--rs2-font-dm-sans), system-ui, sans-serif`,
          "--rs2-font-mono": `var(--rs2-font-jetbrains), ui-monospace, monospace`,
        },
      };
  }
}
