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
 * Liste des catégories en accordéon empilé réplique de l'ancien #list-menu.
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
        className="mx-auto mt-8 w-[92%] py-12 text-center lg:max-w-[1100px]"
        style={{ color: theme.textBody, opacity: 0.7 }}
      >
        <p className="italic">{t("bientotDispo", lang)}</p>
      </div>
    );
  }

  return (
    <ul
      id="list-menu"
      className="mx-auto mt-[30px] flex w-[92%] flex-col gap-2.5 md:gap-3 lg:mt-12 lg:max-w-[1100px]"
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

  // Couleurs : couleur custom de la catégorie en priorité, sinon navy/jaune
  const bgColor =
    cat.couleur || (isSubcat ? theme.bgSubcat : theme.primary);
  const textColor = isSubcat ? theme.textOnSubcat : theme.textOnPrimary;

  // Happy Hour active = scheduleType "happy_hour" (la cat n'apparaît
  // que si le filter serveur l'a laissée passer = on est dans le créneau).
  // On ajoute donc un effet pulsant + badge "🍹 ACTIVE" pour signaler
  // l'opportunité au client.
  const isHappyHourActive = cat.scheduleType === "happy_hour";

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
        className={`relative flex w-full items-center justify-between gap-3 rounded-[10px] px-4 py-[15px] font-semibold transition-opacity hover:opacity-90 md:py-4 lg:py-[18px] ${
          isHappyHourActive ? "animate-happy-glow" : ""
        }`}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontFamily: "var(--font-body)",
        }}
        aria-expanded={isOpen}
      >
        <span className="shrink-0">
          <CategoryIcon code={cat.icone} className="size-[22px] md:size-6" />
        </span>
        <span className="flex-1 truncate text-center text-base md:text-[17px] lg:text-[18px]">
          {cat.titre}
          {isHappyHourActive && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="ml-2 inline-block rounded-full bg-orange-500 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-white shadow-lg"
              style={{
                boxShadow:
                  "0 0 12px rgba(255, 155, 74, 0.6), 0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              🍹 EN COURS
            </motion.span>
          )}
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
            <div className="mt-2.5 flex flex-col gap-2.5 md:gap-3 lg:mt-3 lg:gap-4">
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
                <ul className="flex flex-col gap-2.5 md:gap-3">
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
