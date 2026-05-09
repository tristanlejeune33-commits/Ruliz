"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import type { SupportedLang } from "@/lib/langs";
import { VignetteIcon, hasVignetteVisual } from "./vignette-icon";
import { t } from "./i18n";
import type { CarteTheme } from "./theme";

type Categorie = PublicMenu["categories"][number];
type Produit = Categorie["produits"][number];

interface ProduitCardsProps {
  categorie: Categorie;
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (produit: Produit) => void;
  lang: SupportedLang;
}

/**
 * Liste des produits d'une catégorie — réplique de l'ancien `.list-choice-item`.
 *
 * Pour chaque produit :
 *  - Carte blanche, shadow soft, radius 10
 *  - wrapper-item : flex justify-between align-center, padding 15, gap 15
 *  - infos-wrapper :
 *     - h3 (Magra 20px weight 600) avec badge "Nouveau" + flag origine + vignettes inline
 *     - p.desc (Roboto 300, 1 ligne ellipsis)
 *     - bouton "Voir photo" (italique 600) qui ouvre modal
 *  - p.price (20px weight 600) à droite
 */
export function ProduitCards({
  categorie,
  theme,
  deviseDefault,
  onOpen,
  lang,
}: ProduitCardsProps) {
  if (categorie.produits.length === 0) {
    return (
      <p
        className="px-4 py-6 text-center italic"
        style={{
          color: theme.textBody,
          opacity: 0.6,
          fontFamily: "var(--font-body)",
        }}
      >
        {t("aucunPlat", lang)}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 items-stretch gap-2.5 lg:grid-cols-2 lg:gap-4">
      {categorie.produits.map((p, i) => (
        <ProduitItem
          key={p.id}
          produit={p}
          index={i}
          theme={theme}
          deviseDefault={deviseDefault}
          onOpen={onOpen}
          lang={lang}
        />
      ))}
    </ul>
  );
}

interface ProduitItemProps {
  produit: Produit;
  index: number;
  theme: CarteTheme;
  deviseDefault: string;
  onOpen: (p: Produit) => void;
  lang: SupportedLang;
}

function ProduitItem({
  produit,
  index,
  theme,
  deviseDefault,
  onOpen,
  lang,
}: ProduitItemProps) {
  const visualVignettes = produit.vignettes.filter((v) => hasVignetteVisual(v.code));

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="list-choice-item h-full overflow-hidden rounded-[10px] transition-transform duration-200 ease-out hover:-translate-y-0.5 md:rounded-[12px]"
      style={{
        backgroundColor: theme.cardBody,
        boxShadow: theme.shadow,
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(produit)}
        className="flex h-full w-full items-center justify-between gap-4 p-[15px] text-left md:p-4 lg:p-5"
        style={{ color: theme.textBody }}
      >
        {/* Photo (si présente) — l'ancien template n'en avait pas dans la liste,
            mais on l'ajoute pour le visuel moderne tout en gardant le layout */}
        {produit.imageUrl && (
          <div
            className="relative size-[70px] shrink-0 overflow-hidden rounded-lg md:size-[80px]"
            style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
          >
            <Image
              src={produit.imageUrl}
              alt=""
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Titre + badges + vignettes inline */}
          <h3
            className="flex flex-wrap items-center gap-1.5 text-[18px] font-semibold leading-snug md:text-[19px] lg:text-[20px]"
            style={{
              fontFamily: "var(--font-display)",
              color: theme.textBody,
            }}
          >
            <span>{produit.titre}</span>
            {produit.estNouveau && (
              <span
                className="inline-block rounded-[5px] px-[7px] py-1 text-[11px] font-bold not-italic"
                style={{
                  backgroundColor: theme.bgTag,
                  color: theme.textTag,
                  fontFamily: "var(--font-body)",
                  verticalAlign: "top",
                }}
              >
                {t("nouveau", lang)}
              </span>
            )}
            {produit.origine && (
              <span
                className="inline-flex items-center align-middle text-[10px] uppercase tracking-wider"
                style={{ color: theme.textBody, opacity: 0.7 }}
              >
                🇫🇷
              </span>
            )}
            {visualVignettes.map((v) => (
              <VignetteIcon key={v.code} code={v.code} size={16} />
            ))}
          </h3>

          {/* Description (2 lignes ellipsis) */}
          {produit.description && (
            <p
              className="mt-0.5 line-clamp-2 text-sm font-light leading-relaxed md:text-[14px] lg:text-[15px]"
              style={{
                color: theme.textBody,
                opacity: 0.85,
                fontFamily: "var(--font-body)",
              }}
            >
              {produit.description}
            </p>
          )}

          {/* "Voir photo" / "Voir détails" italique */}
          <span
            className="mt-1.5 inline-block text-[14px] font-semibold italic lg:text-[15px]"
            style={{
              color: theme.textBody,
              fontFamily: "var(--font-body)",
            }}
          >
            {produit.imageUrl ? t("voirPhoto", lang) : t("voirDetails", lang)}
          </span>
        </div>

        {/* Prix à droite */}
        {produit.prix !== null && (
          <div className="shrink-0 text-right">
            <p
              className="whitespace-nowrap text-[18px] font-semibold tabular-nums md:text-[19px] lg:text-[20px]"
              style={{
                color: theme.textBody,
                fontFamily: "var(--font-display)",
              }}
            >
              {formatPrice(produit.prix, produit.devise || deviseDefault)}
            </p>
            {produit.descriptionPrix && (
              <p
                className="text-[10px] italic"
                style={{
                  color: theme.textBody,
                  opacity: 0.6,
                  fontFamily: "var(--font-body)",
                }}
              >
                {produit.descriptionPrix}
              </p>
            )}
          </div>
        )}
      </button>
    </motion.li>
  );
}

function formatPrice(prix: number, devise: string): string {
  const formatted = prix.toFixed(2).replace(".", ",");
  return `${formatted}${devise}`;
}
