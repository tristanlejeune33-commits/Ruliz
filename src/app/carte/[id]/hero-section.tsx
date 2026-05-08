"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";
import { withAlpha } from "./theme";

interface HeroSectionProps {
  restaurant: PublicMenu["restaurant"];
  theme: CarteTheme;
}

export function HeroSection({ restaurant, theme }: HeroSectionProps) {
  const hasBanniere = !!restaurant.banniereUrl;

  return hasBanniere ? (
    <HeroPhoto restaurant={restaurant} theme={theme} />
  ) : (
    <HeroTypographic restaurant={restaurant} theme={theme} />
  );
}

/** Variant avec photo full-bleed : gradient overlay + titre serif blanc */
function HeroPhoto({ restaurant, theme }: HeroSectionProps) {
  return (
    <header className="relative">
      <div className="relative h-[60vh] min-h-[360px] w-full overflow-hidden md:h-[70vh] md:max-h-[600px]">
        <Image
          src={restaurant.banniereUrl!}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1024px"
          unoptimized
          className="object-cover"
        />
        {/* Top gradient pour lisibilité du switcher de langue */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />
        {/* Bottom gradient pour le titre */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center md:pb-14"
        >
          {restaurant.logoUrl && (
            <div className="mx-auto mb-5 size-20 overflow-hidden rounded-full border-4 border-white/95 bg-white shadow-2xl">
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.nom}
                width={80}
                height={80}
                unoptimized
                className="size-full object-cover"
              />
            </div>
          )}
          <h1
            className="text-balance text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl"
            style={{ fontFamily: theme.fontDisplay }}
          >
            {restaurant.nom}
          </h1>
          {restaurant.description && (
            <p className="mx-auto mt-3 max-w-md text-balance text-sm italic leading-relaxed text-white/85 md:text-base">
              {restaurant.description}
            </p>
          )}
          {restaurant.ville && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/80">
              <MapPin className="size-3" />
              {restaurant.ville}
              {restaurant.pays && restaurant.pays !== "France"
                ? ` · ${restaurant.pays}`
                : ""}
            </p>
          )}
        </motion.div>
      </div>
    </header>
  );
}

/** Variant sans photo : fond pastel + titre serif géant + ornement géo */
function HeroTypographic({ restaurant, theme }: HeroSectionProps) {
  const accentBg = withAlpha(theme.accent, theme.isDark ? 0.18 : 0.08);

  return (
    <header
      className="relative overflow-hidden px-6 py-16 text-center md:py-24"
      style={{
        background: `radial-gradient(ellipse at top, ${accentBg} 0%, transparent 70%)`,
      }}
    >
      {/* Ornement géométrique discret */}
      <svg
        className="absolute left-1/2 top-8 -z-10 size-24 -translate-x-1/2 opacity-20 md:top-12 md:size-32"
        viewBox="0 0 100 100"
        fill="none"
        stroke={theme.accent}
        strokeWidth="0.5"
        aria-hidden
      >
        <circle cx="50" cy="50" r="40" />
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="20" />
        <line x1="10" y1="50" x2="90" y2="50" />
        <line x1="50" y1="10" x2="50" y2="90" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {restaurant.logoUrl && (
          <div className="mx-auto mb-6 size-20 overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/5">
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.nom}
              width={80}
              height={80}
              unoptimized
              className="size-full object-cover"
            />
          </div>
        )}
        <h1
          className="text-balance text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          style={{
            fontFamily: theme.fontDisplay,
            color: theme.textTitre,
          }}
        >
          {restaurant.nom}
        </h1>
        {restaurant.description && (
          <p
            className="mx-auto mt-4 max-w-md text-balance text-sm italic leading-relaxed md:text-base"
            style={{ color: theme.textMuted, fontFamily: theme.fontDisplay }}
          >
            {restaurant.description}
          </p>
        )}
        {restaurant.ville && (
          <p
            className="mt-5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em]"
            style={{ color: theme.textMuted }}
          >
            <span className="block h-px w-8" style={{ background: theme.textMuted }} />
            <MapPin className="size-3" />
            {restaurant.ville}
            <span className="block h-px w-8" style={{ background: theme.textMuted }} />
          </p>
        )}
      </motion.div>
    </header>
  );
}
