"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateShippingSettings } from "@/server/admin/boutique/shipping-actions";

interface ShippingEditorProps {
  initial: {
    feeCentimes: number;
    freeThresholdCentimes: number;
    label: string;
    active: boolean;
  };
}

/**
 * Éditeur des frais de port de la boutique QR — admin uniquement.
 *
 * 4 champs :
 *  - Active : on/off (si off, livraison gratuite partout)
 *  - Tarif (€) : montant facturé sur chaque commande
 *  - Seuil livraison offerte (€) : si commande >= seuil, 0€ frais de port
 *    (0 = pas de seuil, frais appliqués à toute commande)
 *  - Libellé : ce qui s'affiche sur la facture et le panier client
 */
export function ShippingEditor({ initial }: ShippingEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [feeEuros, setFeeEuros] = useState(initial.feeCentimes / 100);
  const [thresholdEuros, setThresholdEuros] = useState(
    initial.freeThresholdCentimes / 100,
  );
  const [label, setLabel] = useState(initial.label);
  const [active, setActive] = useState(initial.active);

  const feeCentimes = Math.round(feeEuros * 100);
  const thresholdCentimes = Math.round(thresholdEuros * 100);
  const isDirty =
    feeCentimes !== initial.feeCentimes ||
    thresholdCentimes !== initial.freeThresholdCentimes ||
    label !== initial.label ||
    active !== initial.active;

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateShippingSettings({
        feeCentimes,
        freeThresholdCentimes: thresholdCentimes,
        label,
        active,
      });
      if (res.ok) {
        toast.success("Frais de port mis à jour");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-violet-soft)] text-[var(--neon-violet)] ring-1 ring-[var(--neon-violet)]/30">
            <Truck className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle>Frais de port</CardTitle>
            <CardDescription className="mt-1">
              Tarif facturé en plus du total panier pour la livraison des
              produits boutique (sets de table, stickers…). Le montant est
              snapshoté sur chaque commande au moment de la création — un
              changement ici n&apos;impacte que les futures commandes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Toggle actif */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
            <div>
              <Label className="text-sm font-medium">
                Activer les frais de port
              </Label>
              <p className="text-[10px] text-[var(--text-muted)]">
                Si désactivé, livraison gratuite pour toutes les commandes.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Champs prix + seuil */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Tarif standard (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={feeEuros}
                onChange={(e) => setFeeEuros(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono"
                disabled={!active}
              />
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Montant ajouté au panier pour chaque commande.
              </p>
            </div>
            <div>
              <Label className="text-xs">
                Seuil livraison offerte (€){" "}
                <span className="text-[var(--text-tertiary)]">— optionnel</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={thresholdEuros}
                onChange={(e) =>
                  setThresholdEuros(parseFloat(e.target.value) || 0)
                }
                className="mt-1 font-mono"
                disabled={!active}
                placeholder="0 = pas de seuil"
              />
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Si commande ≥ ce montant, frais de port = 0€. Laisse 0 pour
                facturer le tarif standard sur toutes les commandes.
              </p>
            </div>
          </div>

          {/* Libellé */}
          <div>
            <Label className="text-xs">Libellé affiché au client</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              className="mt-1"
              disabled={!active}
            />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              Apparaît dans le récap panier, sur la facture PDF et sur la
              page Stripe Checkout.
            </p>
          </div>

          {/* Aperçu */}
          {active && (
            <div className="rounded-lg border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)]/30 p-3 text-xs">
              <p className="font-semibold text-[var(--neon-violet)]">
                Aperçu côté client
              </p>
              <p className="mt-1 text-[var(--text-secondary)]">
                Sous-total panier <strong>30,00 €</strong>
                <br />
                {label} <strong>+ {feeEuros.toFixed(2)} €</strong>
                <br />
                <strong className="text-[var(--text-primary)]">
                  Total à payer : {(30 + feeEuros).toFixed(2)} €
                </strong>
                {thresholdEuros > 0 && (
                  <>
                    <br />
                    <em className="text-[10px] text-[var(--text-tertiary)]">
                      💡 Livraison offerte à partir de {thresholdEuros.toFixed(2)} €
                    </em>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Save button */}
          <Button
            type="button"
            variant={isDirty ? "primary" : "outline"}
            onClick={handleSave}
            disabled={pending || !isDirty}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isDirty ? "Enregistrer" : "Aucun changement"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
