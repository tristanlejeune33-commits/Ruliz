"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import { CategoryTabs } from "./category-tabs";
import { FooterPublic } from "./footer-public";
import { HeroSection } from "./hero-section";
import { LangSwitcher } from "./lang-switcher";
import { ProduitCards } from "./produit-cards";
import { ProduitSheet } from "./produit-sheet";
import { resolveTheme, withAlpha } from "./theme";
import { Roulette } from "./roulette";
import { PopupBanner } from "./popup-banner";

interface CartePublicProps {
  menu: PublicMenu;
  preview: boolean;
}

export function CartePublic({ menu, preview }: CartePublicProps) {
  const theme = useMemo(() => resolveTheme(menu.restaurant), [menu.restaurant]);
  const [activeId, setActiveId] = useState<string | null>(
    menu.categories[0]?.id ?? null,
  );
  const [activeProduitId, setActiveProduitId] = useState<string | null>(null);

  // Suit le scroll → met à jour la tab active selon la catégorie en vue.
  useEffect(() => {
    if (typeof window === "undefined" || menu.categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-cat-id");
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const els = document.querySelectorAll("[data-cat-id]");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [menu.categories]);

  const allProduits = useMemo(
    () => menu.categories.flatMap((c) => c.produits),
    [menu.categories],
  );
  const activeProduit = activeProduitId
    ? allProduits.find((p) => p.id === activeProduitId) ?? null
    : null;
  const suggestionMap = useMemo(
    () => new Map(allProduits.map((p) => [p.id, p])),
    [allProduits],
  );

  const handleSelectCategory = (id: string) => {
    setActiveId(id);
    const el = document.querySelector(`[data-cat-id="${id}"]`);
    if (el) {
      const top = (el as HTMLElement).offsetTop - 56;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const removeBranding = menu.restaurant.plan === "premium";

  return (
    <div
      className="min-h-screen"
      style={{
        background: theme.bg,
        color: theme.text,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      data-preview={preview ? "true" : undefined}
    >
      {/* Lang switcher flottant en haut à droite */}
      <div className="fixed right-4 top-4 z-30 md:right-6 md:top-6">
        <LangSwitcher current={menu.lang} restaurantId={menu.restaurant.id} />
      </div>

      <div className="mx-auto max-w-3xl pb-32">
        <HeroSection restaurant={menu.restaurant} theme={theme} />

        {menu.partiallyTranslated && menu.lang !== "fr" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 rounded-xl border px-3 py-2.5 text-xs md:mx-6"
            style={{
              borderColor: withAlpha("#f59e0b", 0.3),
              background: withAlpha("#f59e0b", 0.08),
              color: "#92400e",
            }}
          >
            🇫🇷 Traduction en cours — quelques éléments restent en français.
          </motion.div>
        )}

        {menu.categories.length > 1 && (
          <CategoryTabs
            categories={menu.categories}
            activeId={activeId}
            onSelect={handleSelectCategory}
            theme={theme}
          />
        )}

        <main className="pt-2">
          {menu.categories.length === 0 ? (
            <p
              className="px-6 py-20 text-center text-base italic"
              style={{ color: theme.textMuted, fontFamily: theme.fontDisplay }}
            >
              La carte sera bientôt disponible.
            </p>
          ) : (
            menu.categories.map((cat, index) => (
              <section
                key={cat.id}
                data-cat-id={cat.id}
                className="scroll-mt-16 pt-8 md:pt-12"
              >
                <h2
                  className="px-4 pb-1 text-3xl font-medium tracking-tight md:px-6 md:text-4xl"
                  style={{
                    color: theme.textCategorie,
                    fontFamily: theme.fontDisplay,
                  }}
                >
                  <span
                    className="mr-3 inline-block align-middle font-mono text-base"
                    style={{ color: theme.accent }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {cat.titre}
                </h2>
                <div
                  className="mx-4 mb-4 mt-2 h-px md:mx-6"
                  style={{
                    background: `linear-gradient(to right, ${withAlpha(theme.accent, 0.5)}, transparent)`,
                  }}
                />
                <ProduitCards
                  categorie={cat}
                  theme={theme}
                  deviseDefault={menu.restaurant.deviseDefault}
                  onOpen={(p) => setActiveProduitId(p.id)}
                />
              </section>
            ))
          )}
        </main>

        <FooterPublic
          restaurant={menu.restaurant}
          theme={theme}
          lang={menu.lang}
          showBranding={!removeBranding}
        />
      </div>

      {/* Sheet produit */}
      <ProduitSheet
        produit={activeProduit}
        open={!!activeProduit}
        onClose={() => setActiveProduitId(null)}
        suggestionMap={suggestionMap}
        onOpenSuggestion={(id) => setActiveProduitId(id)}
        theme={theme}
        deviseDefault={menu.restaurant.deviseDefault}
      />

      {/* Pop-up événement */}
      <AnimatePresence>
        {!preview && menu.popup && (
          <PopupBanner popup={menu.popup} accentColor={theme.accent} />
        )}
      </AnimatePresence>

      {/* Roulette */}
      {!preview && menu.jeu && (
        <Roulette
          jeu={menu.jeu}
          accentColor={theme.accent}
          googleReviewUrl={menu.restaurant.googleReviewUrl}
        />
      )}
    </div>
  );
}
