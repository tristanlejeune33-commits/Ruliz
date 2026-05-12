"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, Truck } from "lucide-react";
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

interface ShippingTierUi {
  /** id local (timestamp) si nouveau, id BDD si existant */
  key: string;
  maxGrams: number;
  feeEuros: number;
  label: string;
}

interface ShippingEditorProps {
  initial: {
    feeCentimes: number;
    freeThresholdCentimes: number;
    label: string;
    active: boolean;
    tiers: Array<{
      id: string;
      maxGrams: number;
      feeCentimes: number;
      label: string;
      position: number;
    }>;
  };
}

/**
 * Éditeur des frais de port — modèle par paliers de poids (Colissimo).
 *
 * - Active : on/off global
 * - Seuil livraison offerte (€) : 0 = désactivé
 * - Libellé client générique
 * - Paliers : tableau éditable « jusqu'à X g → Y € »
 *   • Le calcul prend le 1er palier dont max_grams ≥ poids total panier
 *   • Si poids > tous les paliers → dernier palier (le plus lourd)
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
  const [tiers, setTiers] = useState<ShippingTierUi[]>(
    initial.tiers.length > 0
      ? initial.tiers.map((t) => ({
          key: t.id,
          maxGrams: t.maxGrams,
          feeEuros: t.feeCentimes / 100,
          label: t.label,
        }))
      : [],
  );

  // Trie pour affichage cohérent (du plus léger au plus lourd)
  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.maxGrams - b.maxGrams),
    [tiers],
  );

  const feeCentimes = Math.round(feeEuros * 100);
  const thresholdCentimes = Math.round(thresholdEuros * 100);

  const handleAddTier = () => {
    const lastMax =
      sortedTiers.length > 0
        ? sortedTiers[sortedTiers.length - 1]!.maxGrams
        : 0;
    setTiers([
      ...tiers,
      {
        key: `new-${Date.now()}`,
        maxGrams: lastMax + 500,
        feeEuros: 0,
        label: "",
      },
    ]);
  };

  const handleRemoveTier = (key: string) => {
    setTiers(tiers.filter((t) => t.key !== key));
  };

  const updateTier = (key: string, patch: Partial<ShippingTierUi>) => {
    setTiers(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };

  const handleSave = () => {
    // Validation client : pas de doublons sur maxGrams
    const grams = sortedTiers.map((t) => t.maxGrams);
    if (new Set(grams).size !== grams.length) {
      toast.error("Deux paliers ont la même limite de poids.");
      return;
    }

    startTransition(async () => {
      const res = await updateShippingSettings({
        feeCentimes,
        freeThresholdCentimes: thresholdCentimes,
        label,
        active,
        tiers: sortedTiers.map((t, i) => ({
          maxGrams: t.maxGrams,
          feeCentimes: Math.round(t.feeEuros * 100),
          label: t.label || `Jusqu'à ${t.maxGrams} g`,
          position: i,
        })),
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
            <CardTitle>Frais de port (Colissimo)</CardTitle>
            <CardDescription className="mt-1">
              Définis tes paliers par tranche de poids. Le tarif appliqué à
              chaque commande est calculé à partir du <strong>poids total</strong>{" "}
              des produits du panier (somme des grammages × quantités). Le
              montant est snapshoté sur la commande au moment de la création.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
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

          {/* Seuil livraison offerte + libellé */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                Si commande ≥ ce montant, frais de port = 0€.
              </p>
            </div>
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
                Apparaît dans le récap panier et sur la facture.
              </p>
            </div>
          </div>

          {/* Tarif forfaitaire (fallback si aucun palier) */}
          <div className="rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)]/40 p-3">
            <Label className="text-xs">
              Tarif forfaitaire de secours (€){" "}
              <span className="text-[var(--text-tertiary)]">
                — utilisé uniquement si aucun palier défini
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={feeEuros}
              onChange={(e) => setFeeEuros(parseFloat(e.target.value) || 0)}
              className="mt-1 max-w-[160px] font-mono"
              disabled={!active}
            />
          </div>

          {/* === Paliers Colissimo === */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold">
                  Paliers tarifaires par poids
                </Label>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Le palier appliqué est le <strong>premier</strong> dont la
                  limite ≥ poids total panier. Si poids dépasse tout, on
                  prend le dernier (le plus lourd).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddTier}
                disabled={!active}
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
                Ajouter un palier
              </Button>
            </div>

            {sortedTiers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-glass)] p-4 text-center text-xs text-[var(--text-tertiary)]">
                Aucun palier — c&apos;est le tarif forfaitaire au-dessus qui
                sera appliqué à toute commande.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[var(--border-glass)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-elevated)]/50 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    <tr>
                      <th className="px-3 py-2">Jusqu&apos;à (g)</th>
                      <th className="px-3 py-2">Tarif (€)</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="w-10 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTiers.map((t) => (
                      <tr
                        key={t.key}
                        className="border-t border-[var(--border-glass)]"
                      >
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={t.maxGrams}
                            onChange={(e) =>
                              updateTier(t.key, {
                                maxGrams: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            disabled={!active}
                            className="font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={t.feeEuros}
                            onChange={(e) =>
                              updateTier(t.key, {
                                feeEuros: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={!active}
                            className="font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={t.label}
                            onChange={(e) =>
                              updateTier(t.key, { label: e.target.value })
                            }
                            disabled={!active}
                            placeholder={`Jusqu'à ${t.maxGrams} g`}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveTier(t.key)}
                            disabled={!active}
                            className="text-[var(--neon-danger)]"
                            aria-label="Supprimer ce palier"
                          >
                            <Trash2 className="size-3.5" strokeWidth={1.75} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save button */}
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={pending || !active}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
