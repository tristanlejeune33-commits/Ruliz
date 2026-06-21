"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Infinity as InfinityIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LIMIT_FIELDS,
  TOGGLE_FIELDS,
  type PlanFeatures,
} from "@/lib/plans";
import { savePlanConfig } from "@/server/admin/plan-config-actions";

const EDITABLE: Array<"freemium" | "pro" | "premium"> = [
  "freemium",
  "pro",
  "premium",
];

interface InitialPlan {
  name: string;
  monthlyPriceHT: number;
  yearlyPriceHT: number | null;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: PlanFeatures;
}
type EditPlan = {
  name: string;
  monthly: string;
  yearly: string;
  stripeMonthly: string;
  stripeYearly: string;
  features: PlanFeatures;
};
export interface PlansEditorProps {
  initial: Record<"freemium" | "pro" | "premium", InitialPlan>;
}

function toEdit(p: InitialPlan): EditPlan {
  return {
    name: p.name,
    monthly: String(p.monthlyPriceHT),
    yearly: p.yearlyPriceHT === null ? "" : String(p.yearlyPriceHT),
    stripeMonthly: p.stripePriceIdMonthly ?? "",
    stripeYearly: p.stripePriceIdYearly ?? "",
    features: { ...p.features },
  };
}

export function PlansEditor({ initial }: PlansEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialState = useMemo(
    () => ({
      freemium: toEdit(initial.freemium),
      pro: toEdit(initial.pro),
      premium: toEdit(initial.premium),
    }),
    [initial],
  );
  const [state, setState] = useState(initialState);

  const isDirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(initialState),
    [state, initialState],
  );

  function patch(plan: keyof typeof state, partial: Partial<EditPlan>) {
    setState((s) => ({ ...s, [plan]: { ...s[plan], ...partial } }));
  }
  function patchFeature(
    plan: keyof typeof state,
    key: keyof PlanFeatures,
    value: boolean | number | null,
  ) {
    setState((s) => ({
      ...s,
      [plan]: { ...s[plan], features: { ...s[plan].features, [key]: value } },
    }));
  }

  function onSave() {
    const plans = EDITABLE.map((plan) => {
      const e = state[plan];
      return {
        plan,
        name: e.name.trim() || plan,
        monthlyPriceHT: Number(e.monthly) || 0,
        yearlyPriceHT: e.yearly.trim() === "" ? null : Number(e.yearly) || 0,
        stripePriceIdMonthly: e.stripeMonthly.trim(),
        stripePriceIdYearly: e.stripeYearly.trim(),
        features: e.features,
      };
    });
    startTransition(async () => {
      const res = await savePlanConfig({ plans });
      if (res.ok) {
        toast.success("Plans mis à jour");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans & fonctionnalités</CardTitle>
        <CardDescription>
          Définis ce à quoi chaque plan donne accès. Le plan{" "}
          <strong>Démo</strong> a toujours accès à tout (non éditable). Les
          modifications s&apos;appliquent immédiatement au gating.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left">
                <th className="py-2 pr-3 font-medium text-[var(--text-secondary)]">
                  &nbsp;
                </th>
                <th className="px-3 py-2 text-center font-semibold">
                  Démo
                  <span className="ml-1 align-middle text-[10px] font-normal text-[var(--text-muted)]">
                    (verrouillé)
                  </span>
                </th>
                {EDITABLE.map((p) => (
                  <th key={p} className="px-3 py-2 text-center font-semibold capitalize">
                    {state[p].name || p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ===== Tarif ===== */}
              <SectionRow label="Tarif & Stripe" />
              <MetaRow label="Nom affiché">
                <DemoCell>—</DemoCell>
                {EDITABLE.map((p) => (
                  <Cell key={p}>
                    <Input
                      className="h-9"
                      value={state[p].name}
                      onChange={(e) => patch(p, { name: e.target.value })}
                    />
                  </Cell>
                ))}
              </MetaRow>
              <MetaRow label="Prix mensuel HT (€)">
                <DemoCell>—</DemoCell>
                {EDITABLE.map((p) => (
                  <Cell key={p}>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9 w-24"
                      value={state[p].monthly}
                      onChange={(e) => patch(p, { monthly: e.target.value })}
                    />
                  </Cell>
                ))}
              </MetaRow>
              <MetaRow label="Prix annuel HT (€)">
                <DemoCell>—</DemoCell>
                {EDITABLE.map((p) => (
                  <Cell key={p}>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="—"
                      className="h-9 w-24"
                      value={state[p].yearly}
                      onChange={(e) => patch(p, { yearly: e.target.value })}
                    />
                  </Cell>
                ))}
              </MetaRow>
              <MetaRow label="Stripe price ID (mensuel)">
                <DemoCell>—</DemoCell>
                {EDITABLE.map((p) => (
                  <Cell key={p}>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder="price_…"
                      value={state[p].stripeMonthly}
                      onChange={(e) => patch(p, { stripeMonthly: e.target.value })}
                    />
                  </Cell>
                ))}
              </MetaRow>
              <MetaRow label="Stripe price ID (annuel)">
                <DemoCell>—</DemoCell>
                {EDITABLE.map((p) => (
                  <Cell key={p}>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder="price_…"
                      value={state[p].stripeYearly}
                      onChange={(e) => patch(p, { stripeYearly: e.target.value })}
                    />
                  </Cell>
                ))}
              </MetaRow>

              {/* ===== Limites ===== */}
              <SectionRow label="Limites (vide = illimité)" />
              {LIMIT_FIELDS.map((f) => (
                <MetaRow key={f.key} label={f.label}>
                  <DemoCell>
                    <InfinityIcon className="mx-auto size-4 text-[var(--accent)]" />
                  </DemoCell>
                  {EDITABLE.map((p) => {
                    const v = state[p].features[f.key] as number | null;
                    return (
                      <Cell key={p}>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="∞"
                          className="h-9 w-20"
                          value={v === null ? "" : String(v)}
                          onChange={(e) => {
                            const t = e.target.value.trim();
                            patchFeature(
                              p,
                              f.key,
                              t === "" ? null : Math.max(0, parseInt(t, 10) || 0),
                            );
                          }}
                        />
                      </Cell>
                    );
                  })}
                </MetaRow>
              ))}

              {/* ===== Fonctionnalités ===== */}
              <SectionRow label="Fonctionnalités" />
              {TOGGLE_FIELDS.map((f) => (
                <MetaRow key={f.key} label={f.label}>
                  <DemoCell>
                    <Check className="mx-auto size-4 text-[var(--accent)]" />
                  </DemoCell>
                  {EDITABLE.map((p) => (
                    <Cell key={p}>
                      <div className="flex justify-center">
                        <Switch
                          checked={Boolean(state[p].features[f.key])}
                          onCheckedChange={(c) => patchFeature(p, f.key, c)}
                        />
                      </div>
                    </Cell>
                  ))}
                </MetaRow>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {isDirty && (
            <span className="text-xs text-[var(--text-muted)]">
              Modifications non enregistrées
            </span>
          )}
          <Button onClick={onSave} disabled={!isDirty || pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Enregistrer les plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={4}
        className="pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
      >
        {label}
      </td>
    </tr>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-[var(--border-subtle)]/50">
      <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{label}</td>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5 text-center">{children}</td>;
}

function DemoCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="bg-[var(--bg-elevated)]/40 px-3 py-1.5 text-center text-[var(--text-muted)]">
      {children}
    </td>
  );
}
