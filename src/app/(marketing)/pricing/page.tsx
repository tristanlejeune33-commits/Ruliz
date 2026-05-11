import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, formatPriceEuro, type PlanConfig } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Tarifs · Ruliz",
  description: "Plans Freemium / Pro / Premium pour ton restaurant. Sans engagement, prix HT.",
};

const FEATURE_ROWS: Array<{
  key: keyof PlanConfig["features"];
  label: string;
}> = [
  { key: "maxRestaurants", label: "Nombre de restaurants" },
  { key: "maxQrcodes", label: "QR codes" },
  { key: "maxProduits", label: "Produits par carte" },
  { key: "iaTranslation", label: "Traduction automatique en 7 langues" },
  { key: "advancedStats", label: "Statistiques avancées" },
  { key: "rouletteGame", label: "Jeu roulette d'avis Google" },
  { key: "popups", label: "Pop-ups événements" },
  { key: "maxTeamMembers", label: "Membres d'équipe" },
  { key: "customDomain", label: "Domaine personnalisé" },
  { key: "smsMarketing", label: "SMS marketing" },
  { key: "removeBranding", label: 'Retirer "Propulsé par Ruliz"' },
];

export default function PricingPage() {
  const plans = Object.values(PLANS);

  return (
    <div>
      <section className="border-b border-[var(--border-subtle)] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Tarifs HT</Badge>
          <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Un prix par restaurant.{" "}
            <span className="text-[var(--text-secondary)]">Sans engagement.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-[var(--text-secondary)] md:text-lg">
            Démarre gratuitement. Passe Pro quand tu veux, annule en un clic.
            Essai Pro <strong>14 jours offerts</strong>.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <PricingCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-balance text-3xl font-semibold tracking-tight">
            Tableau comparatif
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">
                    Fonctionnalité
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.id}
                      className="px-4 py-3 text-center font-medium text-[var(--text-muted)]"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">{row.label}</td>
                    {plans.map((p) => {
                      const v = p.features[row.key];
                      return (
                        <td key={p.id} className="px-4 py-3 text-center">
                          {typeof v === "boolean" ? (
                            v ? (
                              <Check className="mx-auto size-4 text-[var(--accent)]" />
                            ) : (
                              <X className="mx-auto size-4 text-[var(--text-muted)]" />
                            )
                          ) : (
                            <span
                              className={
                                v === null
                                  ? "font-mono text-xs text-[var(--accent)]"
                                  : "font-mono text-xs"
                              }
                            >
                              {v === null ? "Illimité" : v}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-6 py-20 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Prêt à digitaliser ta carte ?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--text-secondary)]">
          Setup en 10 minutes. Zéro carte bleue requise pour démarrer.
        </p>
        <Button size="lg" asChild className="mt-8">
          <Link href="/signup">
            Créer mon compte <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

function PricingCard({ plan }: { plan: PlanConfig }) {
  const isFreemium = plan.id === "freemium";

  return (
    <Card
      className={
        plan.highlighted
          ? "relative overflow-hidden border-[var(--accent)]/40"
          : "relative overflow-hidden"
      }
    >
      {plan.highlighted && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background: "radial-gradient(circle at 50% 0%, var(--accent)33 0%, transparent 60%)",
          }}
          aria-hidden
        />
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          {plan.highlighted && (
            <Badge>
              <Sparkles className="size-3" /> Recommandé
            </Badge>
          )}
        </div>
        <CardDescription className="mt-3 flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatPriceEuro(plan.monthlyPriceHT)}
          </span>
          {plan.monthlyPriceHT > 0 && (
            <span className="text-xs text-[var(--text-muted)]">HT / mois</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          asChild
          variant={plan.highlighted ? "default" : "outline"}
          className="w-full"
        >
          <Link
            href={isFreemium ? "/signup" : `/signup?plan=${plan.id}`}
          >
            {plan.cta}
          </Link>
        </Button>
        <ul className="space-y-2 pt-2 text-sm">
          {bulletPoints(plan).map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-[var(--text-secondary)]"
            >
              <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function bulletPoints(plan: PlanConfig): string[] {
  const f = plan.features;
  const pts: string[] = [];
  pts.push(
    f.maxRestaurants === null
      ? "Restaurants illimités"
      : `${f.maxRestaurants} restaurant${f.maxRestaurants > 1 ? "s" : ""}`,
  );
  pts.push(
    f.maxProduits === null
      ? "Produits illimités"
      : `${f.maxProduits} produits par carte`,
  );
  if (f.iaTranslation) pts.push("Traduction automatique en 7 langues");
  if (f.advancedStats) pts.push("Statistiques avancées");
  if (f.rouletteGame) pts.push("Jeu roulette d'avis Google");
  if (f.popups) pts.push("Pop-ups événements");
  if (f.customDomain) pts.push("Domaine personnalisé");
  if (f.smsMarketing) pts.push("SMS marketing");
  if (f.removeBranding) pts.push('Sans "Propulsé par Ruliz"');
  if (plan.id === "pro") pts.unshift("14 jours d'essai gratuit");
  return pts;
}
