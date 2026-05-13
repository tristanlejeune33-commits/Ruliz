"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import type { SupportedLang } from "@/lib/langs";
import { VignetteIcon, hasVignetteVisual } from "./vignette-icon";
import {
  ALLERGENE_EMOJI,
  VIGNETTE_EMOJI,
  allergeneLabel,
  t,
  vignetteLabel,
} from "./i18n";
import type { CarteTheme } from "./theme";

type Produit = PublicMenu["categories"][number]["produits"][number];

interface ProduitSheetProps {
  produit: Produit | null;
  open: boolean;
  onClose: () => void;
  suggestionMap: Map<string, Produit>;
  onOpenSuggestion: (id: string) => void;
  theme: CarteTheme;
  deviseDefault: string;
  lang: SupportedLang;
}

/**
 * Modal de détail produit · réplique de l'ancien `.modal-content` :
 *   - bg blanc card-body, padding 15, radius 10, shadow soft
 *   - max-h 80vh, max-w 80% mobile / 60% desktop
 *   - dish-detail : titre Magra 25px, prix 20px, ingredients 300, image 300px
 *   - tags-list : pills rounded 50px avec icones colorées + libellé Magra
 *   - allegeance : box allergènes
 *   - suggestion : "À marier avec" + cards stackées
 */
export function ProduitSheet({
  produit,
  open,
  onClose,
  suggestionMap,
  onOpenSuggestion,
  theme,
  deviseDefault,
  lang,
}: ProduitSheetProps) {
  const suggestions = produit
    ? produit.suggestionsIds
        .map((id) => suggestionMap.get(id))
        .filter((p): p is Produit => !!p)
    : [];

  return (
    <AnimatePresence>
      {open && produit && (
        <motion.div
          key="modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
          }}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[10px] md:max-w-2xl"
            style={{
              backgroundColor: theme.cardBody,
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
              color: theme.textBody,
            }}
          >
            {/* Bouton X fixe en haut-droit, hors du scroll → reste cliquable
                même quand on scrolle le contenu. Touch target 44×44 (Apple HIG)
                + fond blanc opaque obligatoire pour rester visible sur tous
                les thèmes resto. */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-[10] flex size-11 items-center justify-center rounded-full shadow-md transition-transform active:scale-95"
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
              }}
              aria-label="Fermer"
            >
              <X className="size-5" strokeWidth={2} />
            </button>

            {/* Zone scrollable interne · séparée du button X pour qu'il
                reste visible et cliquable en permanence. */}
            <div className="flex-1 overflow-y-auto p-[15px]">
              <DishDetail
                produit={produit}
                theme={theme}
                deviseDefault={deviseDefault}
                lang={lang}
              />

              {/* À marier avec : suggestions */}
              {suggestions.length > 0 && (
                <Suggestions
                  suggestions={suggestions}
                  onOpenSuggestion={onOpenSuggestion}
                  theme={theme}
                  deviseDefault={deviseDefault}
                  lang={lang}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// DishDetail : titre + prix + ingredients + allergènes + tags + photo
// ---------------------------------------------------------------------------

function DishDetail({
  produit,
  theme,
  deviseDefault,
  lang,
}: {
  produit: Produit;
  theme: CarteTheme;
  deviseDefault: string;
  lang: SupportedLang;
}) {
  return (
    <div className="flex flex-col gap-[7px] pt-1">
      <div>
        <h2
          className="text-[24px] font-semibold leading-tight"
          style={{
            color: theme.textBody,
            fontFamily: "var(--font-display)",
            width: "90%",
          }}
        >
          {produit.titre}
          {produit.estNouveau && (
            <span
              className="ml-2 inline-block rounded-[5px] px-[7px] py-1 align-middle text-[11px] font-bold"
              style={{
                backgroundColor: theme.bgTag,
                color: theme.textTag,
                fontFamily: "var(--font-body)",
              }}
            >
              {t("nouveau", lang)}
            </span>
          )}
        </h2>
        {produit.description && (
          <p
            className="mt-1 text-[15px] font-light leading-relaxed"
            style={{
              color: theme.textBody,
              fontFamily: "var(--font-body)",
            }}
          >
            {produit.description}
          </p>
        )}
      </div>

      {/* Prix · tableau de variantes si défini, sinon prix simple */}
      {produit.prixVariantes && produit.prixVariantes.length > 0 ? (
        <div>
          <ul className="flex flex-col gap-1.5">
            {produit.prixVariantes.map((v, idx) => (
              <li
                key={`${v.label}-${idx}`}
                className="flex items-baseline justify-between gap-3 rounded-[10px] px-3 py-2"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                }}
              >
                <span
                  className="text-[14px] font-medium"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {v.label}
                </span>
                <span
                  className="text-[18px] font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {formatPrice(v.prix, produit.devise || deviseDefault)}
                </span>
              </li>
            ))}
          </ul>
          {produit.descriptionPrix && (
            <p
              className="mt-2 text-xs italic opacity-70"
              style={{
                color: theme.textBody,
                fontFamily: "var(--font-body)",
              }}
            >
              {produit.descriptionPrix}
            </p>
          )}
        </div>
      ) : produit.prix !== null ? (
        <div>
          <p
            className="text-[20px] font-semibold tabular-nums"
            style={{
              color: theme.textBody,
              fontFamily: "var(--font-display)",
            }}
          >
            {formatPrice(produit.prix, produit.devise || deviseDefault)}
          </p>
          {produit.descriptionPrix && (
            <p
              className="text-xs italic opacity-70"
              style={{
                color: theme.textBody,
                fontFamily: "var(--font-body)",
              }}
            >
              {produit.descriptionPrix}
            </p>
          )}
        </div>
      ) : null}

      {/* Allergènes */}
      {produit.allergenes.length > 0 && (
        <div className="allegeance">
          <h3
            className="text-[18px] font-semibold"
            style={{
              color: theme.textBody,
              fontFamily: "var(--font-display)",
            }}
          >
            {t("allergens", lang)}
          </h3>
          <ul
            className="flex flex-wrap gap-1.5"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {produit.allergenes.map((a) => {
              const emoji = ALLERGENE_EMOJI[a.code] ?? "⚠️";
              return (
                <li
                  key={a.code}
                  // Fond blanc opaque + texte noir TOUJOURS · info légale
                  // critique, doit rester 100% lisible sur N'IMPORTE quel
                  // thème resto (sombre, photo, fond custom jaune, etc.)
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium shadow-sm"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <span aria-hidden>{emoji}</span>
                  <span>{allergeneLabel(a.code, a.labelFr, lang)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tags / vignettes pills (icône + emoji fallback) · fond blanc + texte
          noir TOUJOURS pour rester lisibles peu importe le thème resto
          (cardBody dynamique pouvait donner un fond jaune/marron illisible). */}
      {produit.vignettes.length > 0 && (
        <ul className="mt-1 flex flex-wrap items-center gap-2.5">
          {produit.vignettes.map((v) => {
            const hasVisual = hasVignetteVisual(v.code);
            const emoji = VIGNETTE_EMOJI[v.code];
            return (
              <li
                key={v.code}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] font-semibold shadow-sm"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {hasVisual ? (
                  // L'icône Lucide garde sa couleur sémantique (vert pour
                  // bio/végé, rouge pour épicé, etc.). Pas de bulle blanche
                  // car le fond du conteneur EST blanc.
                  <VignetteIcon code={v.code} size={16} wrapped={false} />
                ) : emoji ? (
                  <span className="text-base" aria-hidden>
                    {emoji}
                  </span>
                ) : null}
                <span>{vignetteLabel(v.code, v.labelFr, lang)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Origine */}
      {produit.origine && (
        <p
          className="text-[12px] italic opacity-70"
          style={{
            color: theme.textBody,
            fontFamily: "var(--font-body)",
          }}
        >
          🇫🇷 {t("origine", lang)} : {produit.origine}
        </p>
      )}

      {/* Photo */}
      {produit.imageUrl && (
        <div className="mt-2 overflow-hidden rounded-[10px] md:max-w-[300px]">
          <Image
            src={produit.imageUrl}
            alt={produit.titre}
            width={600}
            height={450}
            unoptimized
            className="size-full object-cover"
          />
        </div>
      )}

      {/* Remarque (Le mot du chef…) */}
      {produit.titreRemarque && (
        <div
          className="mt-2 rounded-[8px] border border-black/5 border-l-4 p-3 shadow-sm"
          style={{
            borderLeftColor: theme.primary,
            backgroundColor: "#ffffff",
          }}
        >
          <p
            className="text-[14px] font-semibold uppercase tracking-wider"
            style={{
              color: theme.primary,
              fontFamily: "var(--font-display)",
            }}
          >
            {produit.titreRemarque}
          </p>
          {produit.descriptionRemarque && (
            <p
              className="mt-1 text-[14px] italic"
              style={{
                color: "#1f2937",
                fontFamily: "var(--font-body)",
              }}
            >
              {produit.descriptionRemarque}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestions : "À marier avec…"
// ---------------------------------------------------------------------------

function Suggestions({
  suggestions,
  onOpenSuggestion,
  theme,
  deviseDefault,
  lang,
}: {
  suggestions: Produit[];
  onOpenSuggestion: (id: string) => void;
  theme: CarteTheme;
  deviseDefault: string;
  lang: SupportedLang;
}) {
  return (
    <div className="suggestion mt-4 flex flex-col gap-[7px]">
      <h3
        className="text-[18px] font-semibold"
        style={{
          color: theme.textBody,
          fontFamily: "var(--font-display)",
        }}
      >
        {t("aMarier", lang)}
      </h3>
      <ul className="flex flex-col gap-[7px]">
        {suggestions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onOpenSuggestion(s.id)}
              className="flex w-full flex-col gap-1.5 rounded-[10px] p-2.5 text-left transition-opacity hover:opacity-80"
              style={{
                backgroundColor: theme.cardBody,
                boxShadow: theme.shadow,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4
                  className="text-[18px] font-semibold leading-tight"
                  style={{
                    color: theme.textBody,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {s.titre}
                </h4>
                {s.prix !== null && (
                  <span
                    className="shrink-0 text-[18px] font-semibold tabular-nums"
                    style={{
                      color: theme.textBody,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {formatPrice(s.prix, s.devise || deviseDefault)}
                  </span>
                )}
              </div>
              {s.description && (
                <p
                  className="text-[13px] font-light"
                  style={{
                    color: theme.textBody,
                    opacity: 0.85,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {s.description}
                </p>
              )}
              <span
                className="text-[14px] font-semibold italic"
                style={{
                  color: theme.textBody,
                  fontFamily: "var(--font-body)",
                }}
              >
                {t("voirDetails", lang)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatPrice(prix: number, devise: string): string {
  const formatted = prix.toFixed(2).replace(".", ",");
  return `${formatted}${devise}`;
}
