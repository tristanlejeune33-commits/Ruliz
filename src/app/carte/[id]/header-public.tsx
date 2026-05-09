"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Gift, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import { LangSwitcher } from "./lang-switcher";
import { CategoryIcon } from "./category-icon";
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
 *  - Burger gauche (ouvre side-menu mobile slide-in)
 *  - Titre "Notre carte" centré (Magra blanc 700)
 *  - Lang switcher droite + bouton cadeau roulette (si jeu actif)
 */
export function HeaderPublic({
  restaurant,
  categories,
  lang,
  theme,
  onSpinClick,
  hasJeu,
}: HeaderPublicProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Toggle bg-dark on scroll (réplique de l'ancien comportement JS)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when side menu open
  useEffect(() => {
    if (menuOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [menuOpen]);

  const goToCategory = (id: string) => {
    setMenuOpen(false);
    const el = document.querySelector(`[data-cat-id="${id}"]`);
    if (el) {
      const top = (el as HTMLElement).offsetTop - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
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
          {/* Burger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="border-0 bg-transparent p-0 text-white"
            aria-label="Menu"
          >
            <Menu className="size-[30px]" />
          </button>

          {/* Titre centré */}
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Notre carte
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

      {/* Side menu mobile (slide from left) */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[900]"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(5px)",
              }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 z-[1000] h-full w-1/2 max-w-[500px] overflow-y-auto p-5"
              style={{ backgroundColor: theme.bgBody }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="mb-2 border-0 bg-transparent p-0 text-[30px]"
                style={{ color: theme.textBody }}
                aria-label="Fermer le menu"
              >
                <X className="size-7" />
              </button>
              <ul
                className="flex flex-col gap-2.5 font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  color: theme.textBody,
                }}
              >
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => goToCategory(cat.id)}
                      className="flex items-center gap-2 text-xl"
                      style={{ color: "inherit" }}
                    >
                      <CategoryIcon code={cat.icone} className="size-5" />
                      {cat.titre}
                    </button>
                  </li>
                ))}
              </ul>

              <div
                className="absolute bottom-12 left-1/2 -translate-x-1/2"
                style={{ color: theme.textBody }}
              >
                <p className="flex items-center gap-2 text-sm">
                  Propulsé par
                  <Link href="https://ruliz.fr" target="_blank" className="font-bold">
                    Ruliz
                  </Link>
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
