"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import { CategoryAccordion } from "./category-accordion";
import { FooterPublic } from "./footer-public";
import { GoogleFeedbackCTA } from "./google-feedback-cta";
import { HeaderPublic } from "./header-public";
import { HeroSection } from "./hero-section";
import { t } from "./i18n";
import { PopupBanner } from "./popup-banner";
import { ProduitSheet } from "./produit-sheet";
import { Roulette } from "./roulette";
import { SocialBar } from "./social-bar";
import { resolveTheme } from "./theme";

interface CartePublicProps {
  menu: PublicMenu;
  preview: boolean;
}

/**
 * Carte publique — assemblage complet, réplique du template original Ruliz.
 *
 * Structure :
 *   <HeaderPublic />        — sticky top, burger + titre + lang + cadeau
 *   <HeroSection />         — banner + logo circulaire + welcome
 *   <SocialBar />           — pills border navy avec FB/IG/TikTok/Web/Google
 *   <CategoryAccordion />   — liste accordéons (navy fermés)
 *   <FooterPublic />        — adresse + propulsé par Ruliz
 *   <PopupBanner />         — popup événement
 *   <Roulette />            — roulette cadeaux
 */
export function CartePublic({ menu, preview }: CartePublicProps) {
  const theme = useMemo(() => resolveTheme(menu.restaurant), [menu.restaurant]);

  // Une catégorie ouverte par défaut (la première) pour ne pas montrer du vide
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const first = menu.categories[0]?.id;
    return new Set(first ? [first] : []);
  });

  const [activeProduitId, setActiveProduitId] = useState<string | null>(null);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  // Auto-popup du jeu concours après X secondes si configuré.
  // On garde un flag en sessionStorage pour ne PAS spammer l'utilisateur
  // qui ferme la modal et reload (1 fois par session navigateur).
  useEffect(() => {
    if (preview) return;
    if (!menu.jeu?.autoPopup) return;
    if (typeof window === "undefined") return;

    const SEEN_KEY = `ruliz:jeu-autopopup-seen:${menu.restaurant.id}`;
    if (window.sessionStorage.getItem(SEEN_KEY) === "1") return;

    const delay = (menu.jeu.autoPopupDelaySec || 3) * 1000;
    const timer = setTimeout(() => {
      setRouletteOpen(true);
      window.sessionStorage.setItem(SEEN_KEY, "1");
    }, delay);

    return () => clearTimeout(timer);
  }, [preview, menu.jeu, menu.restaurant.id]);

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

  const toggleCategory = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeBranding = menu.restaurant.plan === "premium";

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: theme.bgBody,
        color: theme.textBody,
        fontFamily: "var(--font-body), 'Roboto', system-ui, sans-serif",
      }}
      data-preview={preview ? "true" : undefined}
    >
      <HeaderPublic
        restaurant={menu.restaurant}
        categories={menu.categories}
        lang={menu.lang}
        theme={theme}
        hasJeu={!preview && !!menu.jeu}
        onSpinClick={() => setRouletteOpen(true)}
      />

      <HeroSection restaurant={menu.restaurant} theme={theme} />

      {/* Bandeau "traduction partielle" si certains champs n'ont pas de trad */}
      {menu.partiallyTranslated && menu.lang !== "fr" && (
        <div
          className="mx-auto mt-4 w-[90%] rounded-lg border px-3 py-2.5 text-center text-xs xl:w-[70%]"
          style={{
            borderColor: "rgba(245, 158, 11, 0.3)",
            background: "rgba(245, 158, 11, 0.08)",
            color: "#92400e",
            fontFamily: "var(--font-body)",
          }}
        >
          {t("tradPartielle", menu.lang)}
        </div>
      )}

      <SocialBar restaurant={menu.restaurant} theme={theme} />

      <CategoryAccordion
        categories={menu.categories}
        openIds={openIds}
        onToggle={toggleCategory}
        onOpenProduit={(p) => setActiveProduitId(p.id)}
        theme={theme}
        deviseDefault={menu.restaurant.deviseDefault}
        lang={menu.lang}
      />

      {/* Box "Jeu Concours" si un jeu actif est configuré */}
      {!preview && menu.jeu && (
        <GoogleFeedbackCTA
          title={t("jeuConcoursTitre", menu.lang)}
          description={menu.jeu.cta || t("jeuConcoursDesc", menu.lang)}
          buttonLabel={t("tournerLaRoue", menu.lang)}
          onSpinClick={() => setRouletteOpen(true)}
          theme={theme}
        />
      )}

      <FooterPublic
        restaurant={menu.restaurant}
        theme={theme}
        lang={menu.lang}
        showBranding={!removeBranding}
      />

      {/* Modal détail produit */}
      <ProduitSheet
        produit={activeProduit}
        open={!!activeProduit}
        onClose={() => setActiveProduitId(null)}
        suggestionMap={suggestionMap}
        onOpenSuggestion={(id) => setActiveProduitId(id)}
        theme={theme}
        deviseDefault={menu.restaurant.deviseDefault}
        lang={menu.lang}
      />

      {/* Popup événement */}
      <AnimatePresence>
        {!preview && menu.popup && (
          <PopupBanner popup={menu.popup} accentColor={theme.primary} />
        )}
      </AnimatePresence>

      {/* Roulette cadeaux (déclenchée par bouton cadeau header OU CTA jeu concours) */}
      {!preview && menu.jeu && (
        <Roulette
          jeu={menu.jeu}
          open={rouletteOpen}
          onClose={() => setRouletteOpen(false)}
          accentColor={theme.primary}
          googleReviewUrl={menu.restaurant.googleReviewUrl}
          facebookUrl={menu.restaurant.facebookUrl}
          instagramUrl={menu.restaurant.instagramUrl}
        />
      )}
    </div>
  );
}
