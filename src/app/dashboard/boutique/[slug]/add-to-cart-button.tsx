"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addToCartAction } from "@/server/dashboard/boutique-cart-actions";

interface AddToCartButtonProps {
  produitId: string;
  produitNom: string;
}

/**
 * Bouton "Ajouter au panier" sur la fiche produit.
 * Sélecteur de quantité + bouton primary cyan + redirection vers panier
 * après ajout (au choix : "Voir mon panier" / "Continuer mes achats").
 */
export function AddToCartButton({
  produitId,
  produitNom,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [quantite, setQuantite] = useState(1);
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const handleAdd = () => {
    setPending(true);
    startTransition(async () => {
      await addToCartAction(produitId, quantite);
      setPending(false);
      toast.success(`${quantite}× ${produitNom} ajouté au panier`, {
        action: {
          label: "Voir le panier",
          onClick: () => router.push("/dashboard/boutique/panier"),
        },
      });
      router.refresh();
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Sélecteur quantité */}
        <div className="flex items-center gap-1">
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
          <span className="w-12 text-center font-mono text-base font-bold tabular-nums">
            {quantite}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setQuantite((q) => Math.min(1000, q + 1))}
            disabled={pending}
            aria-label="Augmenter"
          >
            <Plus className="size-3" strokeWidth={2} />
          </Button>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleAdd}
          disabled={pending}
          className="flex-1"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingBag className="size-4" strokeWidth={1.75} />
          )}
          Ajouter au panier
        </Button>
      </div>
    </Card>
  );
}
