"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Sparkles, X } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";

type Produit = PublicMenu["categories"][number]["produits"][number];

interface ProduitSheetProps {
  produit: Produit | null;
  open: boolean;
  onClose: () => void;
  suggestionMap: Map<string, Produit>;
  onOpenSuggestion: (id: string) => void;
  accentColor: string;
}

export function ProduitSheet({
  produit,
  open,
  onClose,
  suggestionMap,
  onOpenSuggestion,
  accentColor,
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
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-neutral-300" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-md backdrop-blur"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>

            <div className="max-h-[92vh] overflow-y-auto pb-12">
              {produit.imageUrl && (
                <div className="relative mt-4 h-64 w-full overflow-hidden">
                  <Image
                    src={produit.imageUrl}
                    alt={produit.titre}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}

              <div className="px-6 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-balance text-2xl font-semibold tracking-tight">
                    {produit.titre}
                  </h2>
                  {produit.estNouveau && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: `${accentColor}1a`,
                        color: accentColor,
                      }}
                    >
                      <Sparkles className="mr-1 inline size-3" />
                      Nouveau
                    </span>
                  )}
                </div>

                {produit.prix !== null && (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold tabular-nums">
                      {produit.prix.toFixed(2)} {produit.devise}
                    </span>
                    {produit.descriptionPrix && (
                      <span className="text-xs text-neutral-500">
                        {produit.descriptionPrix}
                      </span>
                    )}
                  </div>
                )}

                {produit.description && (
                  <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                    {produit.description}
                  </p>
                )}

                {/* Vignettes */}
                {produit.vignettes.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {produit.vignettes.map((v) => (
                      <span
                        key={v.code}
                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700"
                      >
                        {v.labelFr}
                      </span>
                    ))}
                  </div>
                )}

                {/* Allergènes */}
                {produit.allergenes.length > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900">
                      <AlertTriangle className="size-3" />
                      Allergènes
                    </p>
                    <p className="text-xs text-amber-900/80">
                      {produit.allergenes.map((a) => a.labelFr).join(" · ")}
                    </p>
                  </div>
                )}

                {/* Remarque */}
                {produit.titreRemarque && (
                  <div
                    className="mt-5 rounded-xl border-l-4 bg-neutral-50 p-4"
                    style={{ borderLeftColor: accentColor }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {produit.titreRemarque}
                    </p>
                    {produit.descriptionRemarque && (
                      <p className="mt-1 text-sm text-neutral-700">
                        {produit.descriptionRemarque}
                      </p>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Avec ce plat, on suggère
                    </h3>
                    <ul className="space-y-2">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => onOpenSuggestion(s.id)}
                            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-2 text-left transition-colors hover:border-neutral-400"
                          >
                            {s.imageUrl ? (
                              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                                <Image
                                  src={s.imageUrl}
                                  alt=""
                                  fill
                                  sizes="48px"
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="size-12 shrink-0 rounded-lg bg-neutral-100" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{s.titre}</p>
                              {s.prix !== null && (
                                <p className="font-mono text-xs text-neutral-500">
                                  {s.prix.toFixed(2)} {s.devise}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="size-4 text-neutral-300" />
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
