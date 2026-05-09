"use client";

import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import { CategoryIcon } from "./category-icon";
import { ProduitCards } from "./produit-cards";
import type { CarteTheme } from "./theme";

type Categorie = PublicMenu["categories"][number];
type Produit = Categorie["produits"][number];

interface CategoryAccordionProps {
  categories: Categorie[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onOpenProduit: (p: Produit) => void;
  theme: CarteTheme;
  deviseDefault: string;
}

/**
 * Liste des catégories en accordéon empilé — réplique de l'ancien #list-menu.
 *
 * Chaque catégorie a :
 *  - une barre `btn-collapsed` (navy primary, padding 15, radius 10)
 *  - icone Tabler à gauche (ou Lucide équivalent)
 *  - titre centré (font Roboto bold)
 *  - chevron à droite qui pivote
 *  - liste de produits qui s'expand smoothly en dessous
 */
export function CategoryAccordion({
  categories,
  openIds,
  onToggle,
  onOpenProduit,
  theme,
  deviseDefault,
}: CategoryAccordionProps) {
  if (categories.length === 0) {
    return (
      <div
        className="mx-auto mt-8 w-[90%] py-12 text-center xl:w-[70%]"
        style={{ color: theme.textBody, opacity: 0.7 }}
      >
        <p className="italic">La carte sera bientôt disponible.</p>
      </div>
    );
  }

  return (
    <ul
      id="list-menu"
      className="mx-auto mt-[30px] flex w-[90%] flex-col gap-2.5 xl:w-[70%]"
    >
      {categories.map((cat) => {
        const isOpen = openIds.has(cat.id);
        return (
          <li
            key={cat.id}
            data-cat-id={cat.id}
            className="list-item relative flex flex-col scroll-mt-[80px]"
          >
            {/* btn-collapsed : barre navy cliquable */}
            <button
              type="button"
              onClick={() => onToggle(cat.id)}
              className="btn-collapsed relative cursor-pointer rounded-[10px] px-4 py-[15px] text-center font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary,
                fontFamily: "var(--font-body)",
              }}
              aria-expanded={isOpen}
            >
              {/* Icone à gauche absolute */}
              <span className="absolute left-[25px] top-1/2 -translate-x-1/2 -translate-y-1/2">
                <CategoryIcon code={cat.icone} className="size-[25px]" />
              </span>
              {cat.titre}
              {/* Chevron à droite */}
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="absolute right-[25px] top-1/2 -translate-y-1/2"
              >
                <ChevronDown className="size-5" />
              </motion.span>
            </button>

            {/* list-choice : produits qui s'expand */}
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
                    <ProduitCards
                      categorie={cat}
                      theme={theme}
                      deviseDefault={deviseDefault}
                      onOpen={onOpenProduit}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
