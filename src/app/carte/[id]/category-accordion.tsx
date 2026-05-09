"use client";

import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuCategory, MenuProduit } from "@/server/public/menu";
import type { SupportedLang } from "@/lib/langs";
import { CategoryIcon } from "./category-icon";
import { ProduitCards } from "./produit-cards";
import { t } from "./i18n";
import type { CarteTheme } from "./theme";

interface CategoryAccordionProps {
  categories: MenuCategory[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onOpenProduit: (p: MenuProduit) => void;
  theme: CarteTheme;
  deviseDefault: string;
  lang: SupportedLang;
}

/**
 * Liste des catégories en accordéon empilé — réplique de l'ancien #list-menu.
 *
 * Catégorie top-level :
 *  - barre `btn-collapsed` navy primary, radius 10, padding 15
 *  - icone à gauche, titre centré, chevron à droite qui pivote
 *  - liste de produits qui s'expand smooth en dessous
 *
 * Sous-catégorie (rendue dans `subCategories[]`) :
 *  - même structure mais bg jaune `--bg-subcat` (#ead04d) avec texte noir
 *  - légèrement réduite (95% width, mx auto)
 *
 * Une catégorie peut avoir des produits ET des sous-catégories.
 */
export function CategoryAccordion({
  categories,
  openIds,
  onToggle,
  onOpenProduit,
  theme,
  deviseDefault,
  lang,
}: CategoryAccordionProps) {
  if (categories.length === 0) {
    return (
      <div
        className="mx-auto mt-8 w-[90%] py-12 text-center xl:w-[70%]"
        style={{ color: theme.textBody, opacity: 0.7 }}
      >
        <p className="italic">{t("bientotDispo", lang)}</p>
      </div>
    );
  }

  return (
    <ul
      id="list-menu"
      className="mx-auto mt-[30px] flex w-[90%] flex-col gap-2.5 xl:w-[70%]"
    >
      {categories.map((cat) => (
        <CategoryItem
          key={cat.id}
          cat={cat}
          isSubcat={false}
          openIds={openIds}
          onToggle={onToggle}
          onOpenProduit={onOpenProduit}
          theme={theme}
          deviseDefault={deviseDefault}
          lang={lang}
        />
      ))}
    </ul>
  );
}

interface CategoryItemProps {
  cat: MenuCategory;
  isSubcat: boolean;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onOpenProduit: (p: MenuProduit) => void;
  theme: CarteTheme;
  deviseDefault: string;
  lang: SupportedLang;
}

function CategoryItem({
  cat,
  isSubcat,
  openIds,
  onToggle,
  onOpenProduit,
  theme,
  deviseDefault,
  lang,
}: CategoryItemProps) {
  const isOpen = openIds.has(cat.id);

  // Couleurs : navy pour top-level, jaune pour sous-catégorie
  const bgColor = isSubcat ? theme.bgSubcat : theme.primary;
  const textColor = isSubcat ? theme.textOnSubcat : theme.textOnPrimary;

  return (
    <li
      data-cat-id={cat.id}
      className={`list-item relative flex flex-col scroll-mt-[80px] ${
        isSubcat ? "mx-auto w-[95%]" : ""
      }`}
    >
      {/* btn-collapsed : barre cliquable */}
      <button
        type="button"
        onClick={() => onToggle(cat.id)}
        className="flex w-full items-center justify-between gap-3 rounded-[10px] px-4 py-[15px] font-semibold transition-opacity hover:opacity-90"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontFamily: "var(--font-body)",
        }}
        aria-expanded={isOpen}
      >
        <span className="shrink-0">
          <CategoryIcon code={cat.icone} className="size-[22px]" />
        </span>
        <span className="flex-1 truncate text-center text-base">
          {cat.titre}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
          aria-hidden
        >
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      {/* Contenu : produits + sous-catégories */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex flex-col gap-2.5">
              {/* Produits directs de la catégorie */}
              {cat.produits.length > 0 && (
                <ProduitCards
                  categorie={cat}
                  theme={theme}
                  deviseDefault={deviseDefault}
                  onOpen={onOpenProduit}
                  lang={lang}
                />
              )}

              {/* Sous-catégories (récursivement, en jaune) */}
              {cat.subCategories.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  {cat.subCategories.map((sub) => (
                    <CategoryItem
                      key={sub.id}
                      cat={sub}
                      isSubcat={true}
                      openIds={openIds}
                      onToggle={onToggle}
                      onOpenProduit={onOpenProduit}
                      theme={theme}
                      deviseDefault={deviseDefault}
                      lang={lang}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
