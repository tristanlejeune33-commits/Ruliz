"use client";

import { Globe, Star } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";

// Brand icons inline (Lucide ne livre plus les marques pour cause de trademark)
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
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
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52V6.83a4.85 4.85 0 0 1-1.84-.14z" />
    </svg>
  );
}

interface SocialBarProps {
  restaurant: PublicMenu["restaurant"];
  theme: CarteTheme;
}

/**
 * Barre de réseaux sociaux centrée avec border navy et icônes 40px.
 * Réplique de l'ancien `#social-list-header`.
 */
export function SocialBar({ restaurant, theme }: SocialBarProps) {
  const hasSocial =
    !!(
      restaurant.facebookUrl ||
      restaurant.instagramUrl ||
      restaurant.tiktokUrl ||
      restaurant.siteWeb ||
      restaurant.googleReviewUrl
    );

  if (!hasSocial) return null;

  return (
    <section className="mx-auto mt-[30px] w-[92%] lg:mt-10 lg:max-w-[1100px]">
      <ul
        className="mx-auto flex w-fit gap-4 rounded-full border px-4 py-0 md:gap-5 md:px-6 lg:gap-7 lg:px-8"
        style={{ borderColor: theme.primary }}
      >
        {restaurant.facebookUrl && (
          <SocialItem
            href={restaurant.facebookUrl}
            label="Facebook"
            theme={theme}
          >
            <FacebookIcon className="size-7 md:size-8 lg:size-9" />
          </SocialItem>
        )}
        {restaurant.instagramUrl && (
          <SocialItem
            href={restaurant.instagramUrl}
            label="Instagram"
            theme={theme}
          >
            <InstagramIcon className="size-7 md:size-8 lg:size-9" />
          </SocialItem>
        )}
        {restaurant.tiktokUrl && (
          <SocialItem
            href={restaurant.tiktokUrl}
            label="TikTok"
            theme={theme}
          >
            <TikTokIcon className="size-7 md:size-8 lg:size-9" />
          </SocialItem>
        )}
        {restaurant.siteWeb && (
          <SocialItem href={restaurant.siteWeb} label="Site web" theme={theme}>
            <Globe className="size-7 md:size-8 lg:size-9" />
          </SocialItem>
        )}
        {restaurant.googleReviewUrl && (
          <SocialItem
            href={restaurant.googleReviewUrl}
            label="Avis Google"
            theme={theme}
          >
            <Star className="size-7 md:size-8 lg:size-9" />
          </SocialItem>
        )}
      </ul>
    </section>
  );
}

function SocialItem({
  href,
  label,
  theme,
  children,
}: {
  href: string;
  label: string;
  theme: CarteTheme;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center py-[15px]">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        className="block transition-transform hover:scale-110"
        style={{ color: theme.bgTag }}
      >
        {children}
      </a>
    </li>
  );
}
