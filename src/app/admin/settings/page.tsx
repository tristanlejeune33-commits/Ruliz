import type { Metadata } from "next";
import {
  CheckCircle2,
  Database,
  Key,
  MessageSquare,
  Settings,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { isStripeConfigured } from "@/lib/stripe";
import { requireAdmin } from "@/lib/session";
import { listAllSmsPacks } from "@/server/dashboard/sms-packs";
import { getPlanConfig } from "@/lib/plan-config";
import { SmsPacksEditor } from "./sms-packs-editor";
import { PlansEditor } from "./plans-editor";
import { R2CleanupCard } from "./r2-cleanup-card";

export const metadata: Metadata = {
  title: "Paramètres système Admin Ruliz",
};

/**
 * Page /admin/settings paramètres et infos système pour l'admin.
 *
 * Phase 1 : status check des intégrations (Stripe, Anthropic, R2, Resend, Brevo,
 * Redis, DB) + infos build. Pas d'édition pour l'instant les configs passent
 * par les env vars Railway.
 *
 * Phase 2 (ouverte) : édition des messages email globaux, prix par défaut,
 * langues activées, etc.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();

  const smsPacks = await listAllSmsPacks();

  const planConfig = await getPlanConfig();
  const pickPlan = (c: (typeof planConfig)["pro"]) => ({
    name: c.name,
    monthlyPriceHT: c.monthlyPriceHT,
    yearlyPriceHT: c.yearlyPriceHT,
    stripePriceIdMonthly: c.stripePriceIdMonthly,
    stripePriceIdYearly: c.stripePriceIdYearly,
    features: c.features,
  });
  const planInitial = {
    freemium: pickPlan(planConfig.freemium),
    pro: pickPlan(planConfig.pro),
    premium: pickPlan(planConfig.premium),
  };

  const integrations = [
    {
      name: "Stripe",
      icon: <Key className="size-4" strokeWidth={1.75} />,
      configured: isStripeConfigured(),
      hint: "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_*_PRICE_ID",
      doc: "https://dashboard.stripe.com/apikeys",
    },
    {
      name: "Anthropic Claude",
      icon: <Key className="size-4" strokeWidth={1.75} />,
      configured: !!process.env.ANTHROPIC_API_KEY,
      hint: "ANTHROPIC_API_KEY (claude-haiku-4-5 pour traduction)",
      doc: "https://console.anthropic.com/",
    },
    {
      name: "Cloudflare R2",
      icon: <Database className="size-4" strokeWidth={1.75} />,
      configured:
        !!process.env.R2_ACCOUNT_ID &&
        !!process.env.R2_ACCESS_KEY_ID &&
        !!process.env.R2_SECRET_ACCESS_KEY &&
        !!process.env.R2_BUCKET_NAME,
      hint: "R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET_NAME",
      doc: "https://dash.cloudflare.com/",
    },
    {
      name: "Resend",
      icon: <Key className="size-4" strokeWidth={1.75} />,
      configured: !!process.env.RESEND_API_KEY,
      hint: "RESEND_API_KEY (emails transactionnels)",
      doc: "https://resend.com/api-keys",
    },
    {
      name: "Brevo SMS",
      icon: <Key className="size-4" strokeWidth={1.75} />,
      configured: !!process.env.BREVO_API_KEY,
      hint: "BREVO_API_KEY (SMS marketing)",
      doc: "https://app.brevo.com/settings/keys/api",
    },
    {
      name: "Redis",
      icon: <Database className="size-4" strokeWidth={1.75} />,
      configured: !!process.env.REDIS_URL,
      hint: "REDIS_URL (cache cartes traduites)",
      doc: "https://railway.app/",
    },
    {
      name: "Database (Postgres)",
      icon: <Database className="size-4" strokeWidth={1.75} />,
      configured: !!process.env.DATABASE_URL,
      hint: "DATABASE_URL (Railway Postgres)",
      doc: "https://railway.app/",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        accent="violet"
        eyebrow={
          <HeroEyebrow
            tone="violet"
            icon={<Settings className="size-3" strokeWidth={1.75} />}
          >
            Système
          </HeroEyebrow>
        }
        title="Paramètres système"
        description="Status des intégrations, infos de build et configuration globale. Les valeurs sensibles passent par les env vars Railway cette page est read-only."
      />

      {/* === INTÉGRATIONS === */}
      <Card>
        <CardHeader>
          <CardTitle>Intégrations tierces</CardTitle>
          <CardDescription>
            Status check des services externes. Si un service est ❌ rouge,
            ajoute la / les variable(s) d&apos;env Railway puis redéploie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {integrations.map((it) => (
            <div
              key={it.name}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={
                    it.configured
                      ? "mt-0.5 text-[var(--neon-success)]"
                      : "mt-0.5 text-[var(--neon-danger)]"
                  }
                >
                  {it.configured ? (
                    <CheckCircle2 className="size-5" strokeWidth={1.75} />
                  ) : (
                    <XCircle className="size-5" strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-secondary)]">
                      {it.icon}
                    </span>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {it.name}
                    </p>
                  </div>
                  <p className="mt-0.5 break-all font-mono text-[10px] text-[var(--text-tertiary)]">
                    {it.hint}
                  </p>
                </div>
              </div>
              <a
                href={it.doc}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[11px] text-[var(--neon-cyan)] hover:underline"
              >
                Doc ↗
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* === PRIX DES PACKS SMS === */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30">
              <MessageSquare className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <CardTitle>Prix des packs SMS</CardTitle>
              <CardDescription className="mt-1">
                Modifie les prix et libellés des packs vendus aux
                restaurateurs. Le coût Brevo est d&apos;environ 0,030 € par
                SMS en France : garde une marge ×2 minimum pour la
                rentabilité. Le changement est instantané pour tous les
                clients (pas de redéploiement nécessaire).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SmsPacksEditor packs={smsPacks} />
        </CardContent>
      </Card>

      {/* === Gestion des plans (matrice plan × fonctionnalité) === */}
      <PlansEditor initial={planInitial} />

      {/* === Cleanup images orphelines R2 === */}
      <R2CleanupCard />
    </div>
  );
}
