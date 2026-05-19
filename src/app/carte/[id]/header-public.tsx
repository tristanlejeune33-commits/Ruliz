"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import { LangSwitcher } from "./lang-switcher";
import { t } from "./i18n";
import type { CarteTheme } from "./theme";

interface HeaderPublicProps {
  restaurant: PublicMenu["restaurant"];
  categories: PublicMenu["categories"];
  lang: PublicMenu["lang"];
  theme: CarteTheme;
  onSpinClick?: () => void;
  hasJeu?: boolean;
}

/**
 * Header sticky du template original Ruliz :
 *  - Position fixed top, devient solide noir (--navbar) au scroll
 *  - Titre "Notre carte" centré (Magra blanc 700)
 *  - Lang switcher droite + bouton cadeau roulette (si jeu actif)
 *
 * Le burger menu a été retiré : les catégories sont déjà visibles en
 * accordéon dans le contenu principal (redondance), et son scroll lock
 * (overflow:hidden sur body) causait un layout shift lors de
 * l'ouverture/fermeture des modals.
 */
export function HeaderPublic({
  restaurant,
  lang,
  theme,
  onSpinClick,
  hasJeu,
}: HeaderPublicProps) {
  const [scrolled, setScrolled] = useState(false);

  // Toggle bg-dark on scroll (réplique de l'ancien comportement JS)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="header"
      className="fixed inset-x-0 top-0 z-[100] py-5 transition-colors"
      style={{
        backgroundColor: scrolled ? theme.navbar : "transparent",
        boxShadow: scrolled
          ? "0px 10px 15px -3px rgba(0, 0, 0, 0.1)"
          : undefined,
      }}
    >
      <div className="relative mx-auto flex w-[90%] items-center justify-between xl:w-[70%]">
        {/* Titre à gauche (remplace l'ancien burger menu) */}
        <span
          className="font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("notreCarte", lang)}
        </span>

        {/* Right side : gift + lang */}
        <div className="relative flex items-center gap-2">
          {hasJeu && onSpinClick && (
            <button
              type="button"
              onClick={onSpinClick}
              className="rounded-md px-1.5 py-1 shadow-md"
              style={{
                backgroundColor: theme.cardBody,
                color: theme.textBody,
              }}
              aria-label="Tente ta chance"
            >
              <Gift className="size-[26px]" />
            </button>
          )}
          <LangSwitcher current={lang} restaurantId={restaurant.id} />
        </div>
      </div>
    </header>
  );
}
