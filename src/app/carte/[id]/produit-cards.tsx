"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import { DishPlaceholder } from "./dish-placeholder";
import type { CarteTheme } from "./theme";
import { withAlpha } from "./theme";

type Categorie = PublicMenu["categories"][number];
type Produit = Categorie["produits"][number];

interface ProduitCardsProps {
  categorie: Categorie;
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (produit: Produit) => void;
}

const STAGGER = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const },
});

export function ProduitCards({
  categorie,
  theme,
  deviseDefault,
  onOpen,
}: ProduitCardsProps) {
  if (categorie.produits.length === 0) {
    return (
      <p
        className="px-6 py-12 text-center text-sm italic"
        style={{ color: theme.textMuted, fontFamily: theme.fontDisplay }}
      >
        Aucun plat dans cette catégorie pour l&apos;instant.
      </p>
    );
  }

  switch (categorie.modeAffichage) {
    case "grille":
      return (
        <ModeGrille
          produits={categorie.produits}
          theme={theme}
          deviseDefault={deviseDefault}
          onOpen={onOpen}
        />
      );
    case "carrousel":
      return (
        <ModeCarrousel
          produits={categorie.produits}
          theme={theme}
          deviseDefault={deviseDefault}
          onOpen={onOpen}
        />
      );
    case "liste":
    default:
      return (
        <ModeListe
          produits={categorie.produits}
          theme={theme}
          deviseDefault={deviseDefault}
          onOpen={onOpen}
        />
      );
  }
}

// ----------------------------------------------------------------------------
// Mode Liste — photo carrée gauche 88×88, infos centre, prix droite
// ----------------------------------------------------------------------------

function ModeListe({
  produits,
  theme,
  deviseDefault,
  onOpen,
}: {
  produits: Produit[];
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (p: Produit) => void;
}) {
  return (
    <ul className="divide-y" style={{ borderColor: theme.border }}>
      {produits.map((p, i) => (
        <motion.li key={p.id} {...STAGGER(i)}>
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="group flex w-full items-start gap-4 px-4 py-4 text-left transition-colors duration-200 md:px-6"
            style={{ color: theme.text }}
          >
            <div
              className="relative size-20 shrink-0 overflow-hidden rounded-xl md:size-24"
              style={{ background: withAlpha(theme.accent, 0.05) }}
            >
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt=""
                  fill
                  sizes="96px"
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <DishPlaceholder accent={theme.accent} className="size-full" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h3
                  className="text-balance text-base font-medium leading-snug tracking-tight md:text-lg"
                  style={{
                    color: theme.textTitre,
                    fontFamily: theme.fontDisplay,
                  }}
                >
                  {p.titre}
                </h3>
                {p.estNouveau && (
                  <NouveauBadge accent={theme.accent} />
                )}
              </div>
              {p.description && (
                <p
                  className="mt-1 line-clamp-2 text-xs leading-relaxed md:text-sm"
                  style={{ color: theme.textMuted }}
                >
                  {p.description}
                </p>
              )}
              {p.vignettes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.vignettes.slice(0, 3).map((v) => (
                    <Pill key={v.code} theme={theme}>
                      {v.labelFr}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
            {p.prix !== null && (
              <div className="shrink-0 text-right">
                <span
                  className="font-mono text-base font-semibold tabular-nums md:text-lg"
                  style={{
                    color: theme.textTitre,
                    fontFamily: theme.fontDisplay,
                  }}
                >
                  {formatPrice(p.prix, p.devise || deviseDefault)}
                </span>
                {p.descriptionPrix && (
                  <p className="mt-0.5 text-[10px]" style={{ color: theme.textMuted }}>
                    {p.descriptionPrix}
                  </p>
                )}
              </div>
            )}
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

// ----------------------------------------------------------------------------
// Mode Grille — 2 cols mobile, 3 desktop, photo en hero + infos dessous
// ----------------------------------------------------------------------------

function ModeGrille({
  produits,
  theme,
  deviseDefault,
  onOpen,
}: {
  produits: Produit[];
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (p: Produit) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-3 md:gap-4 md:px-6">
      {produits.map((p, i) => (
        <motion.li key={p.id} {...STAGGER(i)}>
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="group flex w-full flex-col text-left"
          >
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl"
              style={{ background: withAlpha(theme.accent, 0.05) }}
            >
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <DishPlaceholder accent={theme.accent} className="size-full" />
              )}
              {p.estNouveau && (
                <span className="absolute right-2 top-2">
                  <NouveauBadge accent={theme.accent} />
                </span>
              )}
            </div>
            <div className="mt-3 px-1">
              <h3
                className="line-clamp-2 text-balance text-sm font-medium leading-snug tracking-tight md:text-base"
                style={{ color: theme.textTitre, fontFamily: theme.fontDisplay }}
              >
                {p.titre}
              </h3>
              {p.prix !== null && (
                <p
                  className="mt-1 font-mono text-sm font-semibold tabular-nums"
                  style={{ color: theme.text, fontFamily: theme.fontDisplay }}
                >
                  {formatPrice(p.prix, p.devise || deviseDefault)}
                </p>
              )}
            </div>
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

// ----------------------------------------------------------------------------
// Mode Carrousel = mode minimaliste élégant : juste typo + prix + séparateurs
// (pour les vins, fromages, cafés — où l'image n'est pas la valeur ajoutée)
// ----------------------------------------------------------------------------

function ModeCarrousel({
  produits,
  theme,
  deviseDefault,
  onOpen,
}: {
  produits: Produit[];
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (p: Produit) => void;
}) {
  return (
    <ul className="px-4 md:px-8">
      {produits.map((p, i) => (
        <motion.li
          key={p.id}
          {...STAGGER(i)}
          className="border-b py-4 last:border-0"
          style={{ borderColor: theme.border }}
        >
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="group flex w-full items-baseline gap-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h3
                  className="text-balance text-lg font-medium leading-snug tracking-tight md:text-xl"
                  style={{
                    color: theme.textTitre,
                    fontFamily: theme.fontDisplay,
                  }}
                >
                  {p.titre}
                </h3>
                {p.origine && (
                  <span
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: theme.textMuted }}
                  >
                    {p.origine}
                  </span>
                )}
              </div>
              {p.description && (
                <p
                  className="mt-1 text-xs leading-relaxed md:text-sm"
                  style={{ color: theme.textMuted, fontFamily: theme.fontDisplay }}
                >
                  {p.description}
                </p>
              )}
            </div>
            {/* Ligne de pointillés flexible entre titre et prix — old-school menu vibe */}
            <span
              aria-hidden
              className="hidden flex-1 self-end border-b border-dotted pb-2 md:block"
              style={{ borderColor: theme.border }}
            />
            {p.prix !== null && (
              <span
                className="shrink-0 font-mono text-base font-semibold tabular-nums md:text-lg"
                style={{
                  color: theme.textTitre,
                  fontFamily: theme.fontDisplay,
                }}
              >
                {formatPrice(p.prix, p.devise || deviseDefault)}
              </span>
            )}
          </button>
          {p.descriptionPrix && (
            <p
              className="mt-0.5 text-[10px] italic"
              style={{ color: theme.textMuted }}
            >
              {p.descriptionPrix}
            </p>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function NouveauBadge({ accent }: { accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
      style={{
        background: withAlpha(accent, 0.15),
        color: accent,
      }}
    >
      <Sparkles className="size-2.5" />
      Nouveau
    </span>
  );
}

function Pill({
  theme,
  children,
}: {
  theme: CarteTheme;
  children: React.ReactNode;
}) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: withAlpha(theme.text, 0.06),
        color: theme.textMuted,
      }}
    >
      {children}
    </span>
  );
}

function formatPrice(prix: number, devise: string): string {
  const formatted = prix
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(".", ",");
  return `${formatted} ${devise}`;
}
