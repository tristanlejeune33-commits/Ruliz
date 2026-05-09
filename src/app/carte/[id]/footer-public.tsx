"use client";

import Link from "next/link";
import Image from "next/image";
import { Globe, Star, Phone, Mail } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";
import { langLabel } from "./lang-switcher";
import type { SupportedLang } from "@/lib/langs";

// Brand icons inline (Lucide ne livre plus les marques pour cause de trademark)
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52V6.83a4.85 4.85 0 0 1-1.84-.14z" />
    </svg>
  );
}

interface FooterPublicProps {
  restaurant: PublicMenu["restaurant"];
  theme: CarteTheme;
  lang: SupportedLang;
  showBranding: boolean;
}

/**
 * Footer riche navy — réplique exacte du <footer> de l'ancien template Ruliz.
 *
 * Structure :
 *  - SVG wave navy en haut (transition entre le contenu blanc et le footer navy)
 *  - Logo circulaire blanc bordure
 *  - Nom du restaurant (Magra 20px white)
 *  - Adresse multi-lignes
 *  - Téléphone + Email cliquables
 *  - Pills sociales (FB, IG, TikTok, Web, Google review) — fond rgba blanc 14%
 *  - "Propulsé par Ruliz" + langue active
 */
export function FooterPublic({
  restaurant,
  theme,
  lang,
  showBranding,
}: FooterPublicProps) {
  const adresse = [
    restaurant.adresse,
    [restaurant.codePostal, restaurant.ville].filter(Boolean).join(" "),
    restaurant.pays && restaurant.pays !== "France" ? restaurant.pays : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="mt-10 xl:mt-24">
      {/* Wave navy en haut */}
      <svg
        viewBox="0 0 320 33"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="-mb-px block w-full"
        aria-hidden
      >
        <path
          d="M320 2.47202L306.667 4.50984C293.333 6.47147 266.667 10.6614 240 15.6702C213.333 20.7553 186.667 26.8497 160 22.7931C133.333 18.6603 106.667 4.56699 80 1.46265C53.3333 -1.52741 26.6667 6.4715 13.3333 10.6043L1.211e-06 14.6609L2.80937e-06 32.9441L13.3333 32.9441C26.6667 32.9441 53.3333 32.9441 80 32.9441C106.667 32.9441 133.333 32.9441 160 32.9441C186.667 32.9441 213.333 32.9441 240 32.9441C266.667 32.9441 293.333 32.9441 306.667 32.9441L320 32.9441L320 2.47202Z"
          fill={theme.primary}
        />
      </svg>

      {/* Footer body navy */}
      <div
        id="footer"
        className="flex flex-col gap-4 px-2.5 py-6 text-center"
        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
      >
        {/* Logo circulaire blanc */}
        {restaurant.logoUrl && (
          <div className="mx-auto">
            <div
              className="relative size-16 overflow-hidden rounded-full bg-white p-1"
              style={{
                border: "4px solid white",
                boxShadow: "0px 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.nom}
                fill
                sizes="64px"
                unoptimized
                className="rounded-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Nom du restaurant */}
        <h3
          className="text-[20px] font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {restaurant.nom}
        </h3>

        {/* Adresse */}
        {adresse && (
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {adresse}
          </p>
        )}

        {/* Téléphone + Email */}
        {(restaurant.telephone || restaurant.email) && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {restaurant.telephone && (
              <p>
                <a
                  href={`tel:${restaurant.telephone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                  style={{ color: theme.textOnPrimary }}
                >
                  <Phone className="size-4" />
                  {restaurant.telephone}
                </a>
              </p>
            )}
            {restaurant.email && (
              <p>
                <a
                  href={`mailto:${restaurant.email}`}
                  className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                  style={{ color: theme.textOnPrimary }}
                >
                  <Mail className="size-4" />
                  {restaurant.email}
                </a>
              </p>
            )}
          </div>
        )}

        {/* Réseaux sociaux : pills rondes avec fond blanc translucide */}
        {(restaurant.facebookUrl ||
          restaurant.instagramUrl ||
          restaurant.tiktokUrl ||
          restaurant.siteWeb ||
          restaurant.googleReviewUrl) && (
          <ul className="flex justify-center gap-[15px]">
            {restaurant.facebookUrl && (
              <FooterSocialLink href={restaurant.facebookUrl} label="Facebook">
                <FacebookIcon className="size-[25px]" />
              </FooterSocialLink>
            )}
            {restaurant.instagramUrl && (
              <FooterSocialLink href={restaurant.instagramUrl} label="Instagram">
                <InstagramIcon className="size-[25px]" />
              </FooterSocialLink>
            )}
            {restaurant.tiktokUrl && (
              <FooterSocialLink href={restaurant.tiktokUrl} label="TikTok">
                <TikTokIcon className="size-[25px]" />
              </FooterSocialLink>
            )}
            {restaurant.siteWeb && (
              <FooterSocialLink href={restaurant.siteWeb} label="Site web">
                <Globe className="size-[25px]" />
              </FooterSocialLink>
            )}
            {restaurant.googleReviewUrl && (
              <FooterSocialLink
                href={restaurant.googleReviewUrl}
                label="Avis Google"
              >
                <Star className="size-[25px]" />
              </FooterSocialLink>
            )}
          </ul>
        )}

        {/* Branding Ruliz */}
        {showBranding && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs opacity-80">
            <span>Propulsé par</span>
            <Link
              href="https://ruliz.fr"
              target="_blank"
              rel="noreferrer"
              className="font-bold tracking-wide hover:underline"
              style={{ color: theme.textOnPrimary }}
            >
              Ruliz
            </Link>
            <span className="opacity-70">· {langLabel(lang)}</span>
          </div>
        )}
      </div>
    </footer>
  );
}

function FooterSocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className="flex items-center justify-center rounded-full p-2.5 transition-transform hover:scale-110"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.144)" }}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        className="block text-white"
      >
        {children}
      </a>
    </li>
  );
}
