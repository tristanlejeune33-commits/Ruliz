"use client";

import Link from "next/link";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";
import { langLabel } from "./lang-switcher";
import type { SupportedLang } from "@/lib/langs";

interface FooterPublicProps {
  restaurant: PublicMenu["restaurant"];
  theme: CarteTheme;
  lang: SupportedLang;
  showBranding: boolean;
}

/**
 * Footer minimaliste — adresse + propulsé par Ruliz.
 * (La barre sociale est gérée par <SocialBar /> en haut de page.)
 */
export function FooterPublic({
  restaurant,
  theme,
  lang,
  showBranding,
}: FooterPublicProps) {
  return (
    <footer
      className="mx-auto mt-12 w-[90%] py-8 text-center xl:w-[70%]"
      style={{ color: theme.textBody, opacity: 0.85 }}
    >
      {(restaurant.adresse || restaurant.ville) && (
        <p
          className="text-sm italic"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {restaurant.adresse}
          {restaurant.adresse && restaurant.ville && " · "}
          {restaurant.ville}
        </p>
      )}

      {showBranding && (
        <p
          className="mt-4 text-[12px] uppercase tracking-[0.2em]"
          style={{
            color: theme.textBody,
            opacity: 0.5,
            fontFamily: "var(--font-body)",
          }}
        >
          Propulsé par{" "}
          <Link
            href="https://ruliz.fr"
            target="_blank"
            className="font-bold hover:underline"
            style={{ color: theme.primary }}
          >
            Ruliz
          </Link>{" "}
          · {langLabel(lang)}
        </p>
      )}
    </footer>
  );
}
