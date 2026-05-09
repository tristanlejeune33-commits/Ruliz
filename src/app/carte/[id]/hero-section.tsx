"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";

interface HeroSectionProps {
  restaurant: PublicMenu["restaurant"];
  theme: CarteTheme;
}

/**
 * Hero du template Ruliz : banner photo + wave SVG en bas + logo circulaire
 * à cheval sur la wave + h1 du restaurant en dessous.
 *
 * Structure (réplique de l'ancien #banner / #welcome) :
 *   - banner 200px (mobile) → 245px (tablet) → 300-400px (desktop)
 *   - dégradé noir solide sur les 5% du haut puis transparent
 *   - wave SVG (couleur --bg-body) collée au bas
 *   - logo rond 120-150px, bordure blanche 7px, à cheval sur la wave
 *   - h1 (Magra 43px navy) + description sous le logo
 */
export function HeroSection({ restaurant, theme }: HeroSectionProps) {
  return (
    <>
      <Banner restaurant={restaurant} theme={theme} />
      <Welcome restaurant={restaurant} theme={theme} />
    </>
  );
}

function Banner({ restaurant, theme }: HeroSectionProps) {
  // Si pas de bannière, on utilise un fond uni primary (navy)
  const backgroundImage = restaurant.banniereUrl
    ? `linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 5%, rgba(255, 255, 255, 0) 100%), url('${restaurant.banniereUrl}')`
    : undefined;

  return (
    <section className="relative" id="banner">
      <div
        className="relative h-[200px] w-full bg-cover bg-no-repeat md:h-[245px] lg:h-[300px] xl:h-[400px]"
        style={{
          backgroundImage,
          backgroundColor: !restaurant.banniereUrl ? theme.primary : undefined,
        }}
      >
        {/* Wave SVG en bas — réplique exacte de l'ancien template */}
        <svg
          className="absolute bottom-0 left-0 z-[1] -mb-px w-full"
          viewBox="0 0 320 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.3333 19.9209L0 21.922V24H320V9.9532L306.667 13.9365C293.333 17.9947 266.667 25.8493 240 22.9132C226.012 21.3142 212.024 16.7462 198.036 12.1782C185.358 8.03774 172.679 3.89723 160 1.96773C135.745 -1.65532 111.49 2.96779 87.2354 7.59096C84.8236 8.05068 82.4118 8.51039 80 8.96199C53.3333 13.8804 26.6667 17.9947 13.3333 19.9209Z"
            fill={theme.bgBody}
          />
        </svg>

        {/* Logo circulaire — overlay sur la wave */}
        {restaurant.logoUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
            style={{
              top: "84%",
              left: "50%",
              width: "120px",
              height: "120px",
              border: "7px solid white",
              boxShadow: "0px 10px 15px -3px rgba(0, 0, 0, 0.1)",
              background: "white",
            }}
          >
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.nom}
              fill
              sizes="120px"
              unoptimized
              className="object-cover"
              priority
            />
          </motion.div>
        )}

        {/* Variant desktop : logo plus gros */}
        <style jsx>{`
          @media (min-width: 768px) {
            section :global(.banner-logo) {
              top: 75% !important;
            }
          }
          @media (min-width: 1200px) {
            section :global(.banner-logo) {
              width: 150px !important;
              height: 150px !important;
              top: 70% !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

function Welcome({ restaurant, theme }: HeroSectionProps) {
  return (
    <section
      id="welcome"
      className="mx-auto mt-[50px] w-[90%] text-center md:mt-[20px] xl:mt-0 xl:w-[70%]"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        <h1
          id="anchor"
          className="mb-[10px] text-[43px] font-bold leading-tight"
          style={{
            color: theme.title,
            fontFamily: "var(--font-display)",
          }}
        >
          {restaurant.nom}
        </h1>
        {restaurant.description && (
          <p
            className="text-base font-light leading-relaxed"
            style={{
              color: theme.textBody,
              fontFamily: "var(--font-body)",
            }}
          >
            {restaurant.description}
          </p>
        )}
      </motion.div>
    </section>
  );
}
