"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { updateSmsPackSetting } from "@/server/admin/sms-pack-actions";

interface Pack {
  id: string;
  size: number;
  priceCentimes: number;
  label: string;
  badge?: string;
  active: boolean;
}

interface SmsPacksEditorProps {
  packs: Pack[];
}

/**
 * Éditeur de prix des packs SMS — admin uniquement.
 * 4 cartes (Découverte / Boost / Croissance / Maxi) avec :
 *  - Champ taille (nombre de SMS)
 *  - Champ prix (en € avec virgule)
 *  - Champ libellé
 *  - Champ badge optionnel
 *  - Switch actif / inactif
 *
 * Calcul auto du prix par SMS + marge théorique (vs coût Brevo 0.030€/SMS).
 */
export function SmsPacksEditor({ packs }: SmsPacksEditorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}

const BREVO_COST_CENTIMES = 3; // ~0.03€/SMS coût Brevo France

function PackCard({ pack }: { pack: Pack }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [size, setSize] = useState(pack.size);
  const [priceEuros, setPriceEuros] = useState(pack.priceCentimes / 100);
  const [label, setLabel] = useState(pack.label);
  const [badge, setBadge] = useState(pack.badge ?? "");
  const [active, setActive] = useState(pack.active);

  const priceCentimes = Math.round(priceEuros * 100);
  const pricePerSms = size > 0 ? priceCentimes / size : 0;
  const marginVsBrevo = size > 0 ? priceCentimes / (size * BREVO_COST_CENTIMES) : 0;

  const isDirty =
    size !== pack.size ||
    priceCentimes !== pack.priceCentimes ||
    label !== pack.label ||
    (badge || "") !== (pack.badge || "") ||
    active !== pack.active;

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateSmsPackSetting({
        packId: pack.id,
        size,
        priceCentimes,
        label,
        badge: badge.trim() || undefined,
        active,
      });
      if (res.ok) {
        toast.success(`Pack "${label}" mis à jour`);
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-4">
      {/* Header : ID + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            ID : {pack.id}
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {label}{" "}
            {badge && (
              <Badge variant="default" className="ml-1 text-[10px]">
                <Sparkles className="size-2" /> {badge}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {active ? "Visible" : "Masqué"}
          </span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      {/* Champs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-[var(--text-muted)]">
            Nombre de SMS
          </Label>
          <Input
            type="number"
            min={1}
            max={100000}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10) || 0)}
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--text-muted)]">
            Prix (€)
          </Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={priceEuros}
            onChange={(e) => setPriceEuros(parseFloat(e.target.value) || 0)}
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--text-muted)]">
            Libellé visible
          </Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Pack Découverte"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--text-muted)]">
            Badge (optionnel)
          </Label>
          <Input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Populaire / Économie / ..."
            maxLength={50}
            className="mt-1"
          />
        </div>
      </div>

      {/* Calculs auto */}
      <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-3 py-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Prix unitaire
          </p>
          <p className="font-mono tabular-nums">
            {(pricePerSms / 100).toFixed(3)} € / SMS
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Marge vs Brevo (×)
          </p>
          <p
            className={`font-mono tabular-nums ${
              marginVsBrevo < 1.5
                ? "text-[var(--neon-danger)]"
                : marginVsBrevo < 2
                  ? "text-[var(--neon-violet)]"
                  : "text-[var(--neon-success)]"
            }`}
          >
            ×{marginVsBrevo.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Save button */}
      <Button
        type="button"
        size="sm"
        variant={isDirty ? "primary" : "outline"}
        onClick={handleSave}
        disabled={pending || !isDirty}
        className="w-full"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )}
        {isDirty ? "Enregistrer" : "Aucun changement"}
      </Button>
    </div>
  );
}
