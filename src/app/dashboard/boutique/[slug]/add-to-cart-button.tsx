"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addToCartAction } from "@/server/dashboard/boutique-cart-actions";

interface AddToCartButtonProps {
  produitId: string;
  produitNom: string;
  /** null = stock illimité, 0 = rupture, >0 = restant */
  stockRestant?: number | null;
}

/**
 * Bouton "Ajouter au panier" sur la fiche produit.
 * Sélecteur de quantité + bouton primary cyan + redirection vers panier
 * après ajout. Désactive complètement le CTA en cas de rupture, et limite
 * le compteur quantité au stockRestant si défini.
 */
export function AddToCartButton({
  produitId,
  produitNom,
  stockRestant = null,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [quantite, setQuantite] = useState(1);
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const isOutOfStock = stockRestant === 0;
  const maxAllowed =
    stockRestant === null || stockRestant === undefined
      ? 1000
      : Math.max(1, stockRestant);

  const handleAdd = () => {
    setPending(true);
    startTransition(async () => {
      const res = await addToCartAction(produitId, quantite);
      setPending(false);
      if (res.ok) {
        toast.success(`${quantite}× ${produitNom} ajouté au panier`, {
          action: {
            label: "Voir le panier",
            onClick: () => router.push("/dashboard/boutique/panier"),
          },
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (isOutOfStock) {
    return (
      <Card className="border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-[var(--neon-danger)]"
            strokeWidth={1.75}
          />
          <div>
            <p className="font-semibold text-[var(--neon-danger)]">
              Produit en rupture de stock
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Ce produit n&apos;est plus disponible. Reviens plus tard ou
              contacte le support si urgent.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {stockRestant !== null && stockRestant !== undefined && stockRestant <= 10 && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--neon-violet)]">
          <AlertTriangle className="size-3" strokeWidth={2} />
          Plus que {stockRestant} en stock
        </p>
      )}
      <div className="space-y-3">
        {/* Sélecteur quantité · input éditable + boutons +/− */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Quantité
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setQuantite((q) => Math.max(1, q - 1))}
              disabled={pending || quantite <= 1}
              aria-label="Diminuer"
            >
              <Minus className="size-3" strokeWidth={2} />
            </Button>
            <Input
              type="number"
              min={1}
              max={maxAllowed}
              value={quantite}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isFinite(v) || v < 1) {
                  setQuantite(1);
                } else {
                  setQuantite(Math.min(maxAllowed, v));
                }
              }}
              onBlur={(e) => {
                // Si vide ou invalide au blur → reset à 1
                if (!e.target.value || parseInt(e.target.value, 10) < 1) {
                  setQuantite(1);
                }
              }}
              disabled={pending}
              className="h-9 w-20 text-center font-mono text-base font-bold tabular-nums"
              aria-label="Quantité"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setQuantite((q) => Math.min(maxAllowed, q + 1))
              }
              disabled={pending || quantite >= maxAllowed}
              aria-label="Augmenter"
            >
              <Plus className="size-3" strokeWidth={2} />
            </Button>

            {/* Raccourcis quantité courants */}
            <div className="ml-2 hidden flex-wrap gap-1 sm:flex">
              {[10, 50, 100].map((preset) => {
                if (preset > maxAllowed) return null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantite(preset)}
                    disabled={pending}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      quantite === preset
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
          {stockRestant !== null &&
            stockRestant !== undefined &&
            stockRestant > 10 && (
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                Maximum {maxAllowed} en stock
              </p>
            )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleAdd}
          disabled={pending}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingBag className="size-4" strokeWidth={1.75} />
          )}
          Ajouter au panier ({quantite}× article{quantite > 1 ? "s" : ""})
        </Button>
      </div>
    </Card>
  );
}
