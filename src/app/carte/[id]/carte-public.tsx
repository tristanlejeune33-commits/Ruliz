"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Globe, MapPin, Star } from "lucide-react";

// Brand icons (lucide n'inclut plus les marques pour cause de trademark).
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import type { PublicMenu } from "@/server/public/menu";
import type { SupportedLang } from "@/lib/langs";
import { LangSwitcher, langLabel } from "./lang-switcher";
import { ProduitSheet } from "./produit-sheet";
import { Roulette } from "./roulette";
import { PopupBanner } from "./popup-banner";

interface CartePublicProps {
  menu: PublicMenu;
  preview: boolean;
}

export function CartePublic({ menu, preview }: CartePublicProps) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(
    menu.categories[0]?.id ?? null,
  );
  const [activeProduitId, setActiveProduitId] = useState<string | null>(null);

  const accentColor = menu.restaurant.couleurPrimaire ?? "#4870e0";

  const allProduits = menu.categories.flatMap((c) => c.produits);
  const activeProduit = allProduits.find((p) => p.id === activeProduitId) ?? null;
  const suggestionMap = new Map(allProduits.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-3xl pb-32">
      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{
          background: menu.restaurant.banniereUrl
            ? undefined
            : `linear-gradient(180deg, ${accentColor}22 0%, transparent 80%)`,
        }}
      >
        {menu.restaurant.banniereUrl && (
          <div className="relative h-48 w-full overflow-hidden md:h-64">
            <Image
              src={menu.restaurant.banniereUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90" />
          </div>
        )}

        <div className="relative px-5 pb-8 pt-10 text-center">
          {menu.restaurant.logoUrl && (
            <div className="mx-auto mb-4 size-16 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
              <Image
                src={menu.restaurant.logoUrl}
                alt={menu.restaurant.nom}
                width={64}
                height={64}
                unoptimized
                className="size-full object-cover"
              />
            </div>
          )}
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {menu.restaurant.nom}
          </h1>
          {menu.restaurant.ville && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="size-3" />
              {menu.restaurant.ville}
              {menu.restaurant.pays && menu.restaurant.pays !== "France"
                ? `, ${menu.restaurant.pays}`
                : ""}
            </p>
          )}
        </div>
      </header>

      {/* Sticky lang switcher */}
      <div
        className="sticky top-0 z-20 -mt-2 flex items-center justify-between gap-3 border-b border-neutral-200/70 bg-white/80 px-4 py-2 backdrop-blur-md"
        data-preview={preview ? "true" : undefined}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {menu.categories.length} catégorie
          {menu.categories.length > 1 ? "s" : ""}
        </span>
        <LangSwitcher current={menu.lang} restaurantId={menu.restaurant.id} />
      </div>

      {menu.partiallyTranslated && menu.lang !== "fr" && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          🇫🇷 Traduction en cours — quelques éléments restent en français.
        </div>
      )}

      {/* Categories accordeon */}
      <main className="px-3 pt-4">
        {menu.categories.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            La carte sera bientôt disponible.
          </p>
        )}
        <ul className="space-y-2">
          {menu.categories.map((cat, index) => {
            const isOpen = openCategoryId === cat.id;
            return (
              <li
                key={cat.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-8 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                    >
                      {index + 1}
                    </span>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {cat.titre}
                    </h2>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-neutral-400">
                    {cat.produits.length}
                    <ChevronDown
                      className="size-4 transition-transform duration-300"
                      style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <ul className="border-t border-neutral-200/60 px-2 py-2">
                        {cat.produits.length === 0 && (
                          <li className="px-3 py-4 text-sm text-neutral-400">
                            Aucun plat dans cette catégorie.
                          </li>
                        )}
                        {cat.produits.map((p, i) => (
                          <motion.li
                            key={p.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.25 }}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveProduitId(p.id)}
                              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-neutral-50"
                            >
                              {p.imageUrl && (
                                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                  <Image
                                    src={p.imageUrl}
                                    alt=""
                                    fill
                                    sizes="64px"
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <h3 className="flex-1 text-sm font-semibold tracking-tight">
                                    {p.titre}
                                  </h3>
                                  {p.estNouveau && (
                                    <span
                                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                      style={{
                                        backgroundColor: `${accentColor}1a`,
                                        color: accentColor,
                                      }}
                                    >
                                      Nouveau
                                    </span>
                                  )}
                                </div>
                                {p.description && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                                    {p.description}
                                  </p>
                                )}
                                {p.vignettes.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {p.vignettes.slice(0, 3).map((v) => (
                                      <span
                                        key={v.code}
                                        className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
                                      >
                                        {v.labelFr}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {p.prix !== null && (
                                <div className="shrink-0 text-right">
                                  <span className="font-mono text-sm font-semibold tabular-nums">
                                    {p.prix.toFixed(2)} {p.devise}
                                  </span>
                                  {p.descriptionPrix && (
                                    <p className="mt-0.5 text-[10px] text-neutral-400">
                                      {p.descriptionPrix}
                                    </p>
                                  )}
                                </div>
                              )}
                            </button>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-neutral-200 px-6 py-8 text-center">
        {menu.restaurant.googleReviewUrl && (
          <a
            href={menu.restaurant.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Star className="size-4 fill-current" />
            Laisser un avis Google
          </a>
        )}
        <div className="flex justify-center gap-3">
          {menu.restaurant.facebookUrl && (
            <FooterLink href={menu.restaurant.facebookUrl} label="Facebook">
              <FacebookIcon className="size-4" />
            </FooterLink>
          )}
          {menu.restaurant.instagramUrl && (
            <FooterLink href={menu.restaurant.instagramUrl} label="Instagram">
              <InstagramIcon className="size-4" />
            </FooterLink>
          )}
          {menu.restaurant.siteWeb && (
            <FooterLink href={menu.restaurant.siteWeb} label="Site web">
              <Globe className="size-4" />
            </FooterLink>
          )}
        </div>
        {menu.restaurant.adresse && (
          <p className="mt-6 text-xs text-neutral-400">
            {menu.restaurant.adresse}
            {menu.restaurant.ville && `, ${menu.restaurant.ville}`}
          </p>
        )}
        {menu.restaurant.plan !== "premium" && (
          <p className="mt-3 text-[10px] uppercase tracking-widest text-neutral-300">
            Propulsé par Ruliz · {langLabel(menu.lang as SupportedLang)}
          </p>
        )}
      </footer>

      {/* Produit sheet */}
      <ProduitSheet
        produit={activeProduit}
        open={!!activeProduit}
        onClose={() => setActiveProduitId(null)}
        suggestionMap={suggestionMap}
        onOpenSuggestion={(id) => setActiveProduitId(id)}
        accentColor={accentColor}
      />

      {/* Pop-up événement */}
      {!preview && menu.popup && (
        <PopupBanner popup={menu.popup} accentColor={accentColor} />
      )}

      {/* Roulette */}
      {!preview && menu.jeu && (
        <Roulette
          jeu={menu.jeu}
          accentColor={accentColor}
          googleReviewUrl={menu.restaurant.googleReviewUrl}
        />
      )}
    </div>
  );
}

function FooterLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
    >
      {children}
    </a>
  );
}
