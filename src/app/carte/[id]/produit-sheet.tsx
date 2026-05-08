"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import { DishPlaceholder } from "./dish-placeholder";
import type { CarteTheme } from "./theme";
import { withAlpha } from "./theme";

type Produit = PublicMenu["categories"][number]["produits"][number];

interface ProduitSheetProps {
  produit: Produit | null;
  open: boolean;
  onClose: () => void;
  suggestionMap: Map<string, Produit>;
  onOpenSuggestion: (id: string) => void;
  theme: CarteTheme;
  deviseDefault: string;
}

export function ProduitSheet({
  produit,
  open,
  onClose,
  suggestionMap,
  onOpenSuggestion,
  theme,
  deviseDefault,
}: ProduitSheetProps) {
  const suggestions = produit
    ? produit.suggestionsIds
        .map((id) => suggestionMap.get(id))
        .filter((p): p is Produit => !!p)
    : [];

  return (
    <AnimatePresence>
      {open && produit && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[94vh] overflow-hidden rounded-t-3xl shadow-2xl md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:max-h-[88vh] md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
            style={{ background: theme.bgElevated, color: theme.text }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-2.5 md:hidden">
              <span
                className="h-1 w-10 rounded-full"
                style={{ background: withAlpha(theme.text, 0.2) }}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full shadow-md backdrop-blur"
              style={{
                background: withAlpha(theme.bgElevated, 0.85),
                color: theme.text,
              }}
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>

            <div className="max-h-[94vh] overflow-y-auto pb-12 md:max-h-[88vh]">
              <div className="relative mt-4 h-72 w-full overflow-hidden md:mt-0 md:h-80">
                {produit.imageUrl ? (
                  <Image
                    src={produit.imageUrl}
                    alt={produit.titre}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <DishPlaceholder
                    accent={theme.accent}
                    className="size-full"
                  />
                )}
              </div>

              <div className="px-6 pt-6 md:px-8">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="text-balance text-2xl font-medium leading-tight tracking-tight md:text-3xl"
                    style={{
                      color: theme.textTitre,
                      fontFamily: theme.fontDisplay,
                    }}
                  >
                    {produit.titre}
                  </h2>
                  {produit.estNouveau && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
                      style={{
                        background: withAlpha(theme.accent, 0.15),
                        color: theme.accent,
                      }}
                    >
                      <Sparkles className="size-3" />
                      Nouveau
                    </span>
                  )}
                </div>

                {produit.prix !== null && (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className="font-mono text-2xl font-semibold tabular-nums md:text-3xl"
                      style={{
                        color: theme.textTitre,
                        fontFamily: theme.fontDisplay,
                      }}
                    >
                      {formatPrice(produit.prix, produit.devise || deviseDefault)}
                    </span>
                    {produit.descriptionPrix && (
                      <span
                        className="text-xs italic"
                        style={{ color: theme.textMuted }}
                      >
                        {produit.descriptionPrix}
                      </span>
                    )}
                  </div>
                )}

                {produit.description && (
                  <p
                    className="mt-5 text-base leading-relaxed"
                    style={{ color: theme.text }}
                  >
                    {produit.description}
                  </p>
                )}

                {produit.vignettes.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {produit.vignettes.map((v) => (
                      <span
                        key={v.code}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          background: withAlpha(theme.text, 0.06),
                          color: theme.text,
                        }}
                      >
                        {v.labelFr}
                      </span>
                    ))}
                  </div>
                )}

                {produit.allergenes.length > 0 && (
                  <div
                    className="mt-6 rounded-xl border p-4"
                    style={{
                      background: withAlpha("#f59e0b", 0.05),
                      borderColor: withAlpha("#f59e0b", 0.25),
                    }}
                  >
                    <p
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#92400e" }}
                    >
                      <AlertTriangle className="size-3" />
                      Allergènes
                    </p>
                    <p className="text-xs" style={{ color: "#92400e" }}>
                      {produit.allergenes.map((a) => a.labelFr).join(" · ")}
                    </p>
                  </div>
                )}

                {produit.titreRemarque && (
                  <div
                    className="mt-6 rounded-xl border-l-4 p-4"
                    style={{
                      borderLeftColor: theme.accent,
                      background: withAlpha(theme.accent, 0.04),
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: theme.accent }}
                    >
                      {produit.titreRemarque}
                    </p>
                    {produit.descriptionRemarque && (
                      <p
                        className="mt-1.5 text-sm leading-relaxed italic"
                        style={{
                          color: theme.text,
                          fontFamily: theme.fontDisplay,
                        }}
                      >
                        {produit.descriptionRemarque}
                      </p>
                    )}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="mt-10">
                    <h3
                      className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ color: theme.textMuted }}
                    >
                      Avec ce plat, on suggère
                    </h3>
                    <ul className="space-y-2">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => onOpenSuggestion(s.id)}
                            className="flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors duration-200 hover:border-[var(--accent)]"
                            style={{ borderColor: theme.border }}
                          >
                            <div
                              className="relative size-14 shrink-0 overflow-hidden rounded-xl"
                              style={{ background: withAlpha(theme.accent, 0.05) }}
                            >
                              {s.imageUrl ? (
                                <Image
                                  src={s.imageUrl}
                                  alt=""
                                  fill
                                  sizes="56px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <DishPlaceholder
                                  accent={theme.accent}
                                  className="size-full"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-medium"
                                style={{
                                  color: theme.textTitre,
                                  fontFamily: theme.fontDisplay,
                                }}
                              >
                                {s.titre}
                              </p>
                              {s.prix !== null && (
                                <p
                                  className="font-mono text-xs"
                                  style={{ color: theme.textMuted }}
                                >
                                  {formatPrice(s.prix, s.devise || deviseDefault)}
                                </p>
                              )}
                            </div>
                            <ChevronRight
                              className="size-4"
                              style={{ color: theme.textMuted }}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatPrice(prix: number, devise: string): string {
  const formatted = prix
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(".", ",");
  return `${formatted} ${devise}`;
}
