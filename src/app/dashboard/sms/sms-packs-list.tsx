"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSmsPackCheckout } from "@/server/dashboard/sms-actions";

interface Pack {
  id: "starter" | "boost" | "growth" | "scale";
  size: number;
  priceCentimes: number;
  label: string;
  badge?: string;
}

interface SmsPacksListProps {
  restaurantId: string;
  packs: Pack[];
}

/**
 * Liste des packs SMS achetables.
 * Au clic : crée une session Stripe Checkout côté serveur puis redirige.
 * Le webhook crédite le solde une fois le paiement confirmé.
 */
export function SmsPacksList({ restaurantId, packs }: SmsPacksListProps) {
  const [pending, startTransition] = useTransition();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handleBuy = (packId: Pack["id"]) => {
    setLoadingPack(packId);
    startTransition(async () => {
      const res = await createSmsPackCheckout({ restaurantId, packId });
      if (res.ok && res.data) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.ok ? "URL manquante" : res.error);
        setLoadingPack(null);
      }
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {packs.map((pack) => {
        const pricePerSms = (pack.priceCentimes / pack.size / 100).toFixed(3);
        const priceTotal = (pack.priceCentimes / 100).toFixed(2).replace(".", ",");
        const isLoading = loadingPack === pack.id;

        return (
          <div
            key={pack.id}
            className="relative flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4 transition-colors hover:border-[var(--accent)]/40"
          >
            {pack.badge && (
              <Badge
                variant="default"
                className="absolute -top-2 right-3 bg-[var(--accent)] text-white"
              >
                <Sparkles className="size-2.5" /> {pack.badge}
              </Badge>
            )}

            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                {pack.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {pack.size.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-normal text-[var(--text-secondary)]">
                  SMS
                </span>
              </p>
            </div>

            <div className="text-sm">
              <p className="font-semibold tabular-nums">{priceTotal} €</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Soit {pricePerSms.replace(".", ",")} € par SMS
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleBuy(pack.id)}
              disabled={pending}
              className="mt-auto w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Redirection...
                </>
              ) : (
                "Acheter"
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
