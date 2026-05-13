"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBoutiqueCheckoutSession } from "@/server/dashboard/boutique-checkout-actions";

interface PayButtonProps {
  commandeId: string;
  /** Si défini, la commande est déjà payée → on affiche un badge passif. */
  paidAt: string | null;
  /** Si stripe pas configuré côté serveur → bouton désactivé avec hint. */
  stripeConfigured: boolean;
  /** "annulee" → on désactive le paiement avec un message. */
  isAnnulee: boolean;
}

/**
 * Bouton "Payer en ligne" pour une commande boutique.
 * Crée une Stripe Checkout Session et redirige vers Stripe.
 *
 * États :
 *   - paidAt set       → badge vert "Payée le X" (pas de bouton)
 *   - annulée          → texte gris "Commande annulée" (pas de bouton)
 *   - stripe non confs → bouton disabled + hint "Stripe non configuré"
 *   - normal           → bouton primary "Payer en ligne (X €)"
 */
export function PayButton({
  commandeId,
  paidAt,
  stripeConfigured,
  isAnnulee,
}: PayButtonProps) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  if (paidAt) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--neon-success)]">
        <CheckCircle2 className="size-4" strokeWidth={2} />
        Payée le{" "}
        {new Date(paidAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    );
  }

  if (isAnnulee) {
    return (
      <span className="text-xs text-[var(--text-tertiary)]">
        Commande annulée · paiement indisponible
      </span>
    );
  }

  const handleClick = () => {
    if (!stripeConfigured) {
      toast.error("Stripe n'est pas encore configuré. Contacte le support.");
      return;
    }
    setPending(true);
    startTransition(async () => {
      const res = await createBoutiqueCheckoutSession(commandeId);
      setPending(false);
      if (res.ok) {
        // Redirection vers Stripe Checkout
        window.location.href = res.checkoutUrl;
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="primary"
      onClick={handleClick}
      disabled={pending || !stripeConfigured}
      title={!stripeConfigured ? "Stripe n'est pas encore configuré" : undefined}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" strokeWidth={1.75} />
      )}
      {pending ? "Redirection vers Stripe…" : "Payer en ligne"}
    </Button>
  );
}
