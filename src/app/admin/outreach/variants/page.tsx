import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { VariantPreview } from "./variant-preview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Variants emails · Admin Outreach",
};

const DEFAULT_CAMPAIGN = "pilote-2k-2026-05";

const STEP_LABELS: Record<number, string> = {
  1: "J+0 (initial)",
  2: "J+3 (relance)",
  3: "J+7 (offre)",
  4: "J+14 (breakup)",
};

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function VariantsPage({ searchParams }: PageProps) {
  await ensureRuntimeSchema();
  const { campaign: campaignParam } = await searchParams;
  const campaign = campaignParam ?? DEFAULT_CAMPAIGN;

  const variants = await prisma.emailVariant.findMany({
    where: { campaign },
    orderBy: [{ step: "asc" }, { variant: "asc" }],
    select: {
      id: true,
      step: true,
      variant: true,
      subject: true,
      bodyHtml: true,
      generatedBy: true,
      sent: true,
      opened: true,
      clicked: true,
      replied: true,
      converted: true,
      active: true,
    },
  });

  // Groupe par step
  const byStep = new Map<number, typeof variants>();
  for (const v of variants) {
    if (!byStep.has(v.step)) byStep.set(v.step, []);
    byStep.get(v.step)!.push(v);
  }
  const steps = [...byStep.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href={`/admin/outreach?campaign=${campaign}`}>
              <ArrowLeft className="size-3.5" />
              Retour à la campagne
            </Link>
          </Button>
          <Badge variant="secondary">
            <Sparkles className="size-3" />
            {variants.length} variants
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Variants emails
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Visualisez et copiez les HTMLs vers Smartlead.ai. Variables Smartlead :{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs">
              {"{{nom}}"}
            </code>{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs">
              {"{{ville}}"}
            </code>{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs">
              {"{{first_name}}"}
            </code>{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs">
              {"{{preview_url}}"}
            </code>
          </p>
        </div>
      </header>

      {variants.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Aucun variant pour cette campagne.<br/>
              Lance{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-2 py-1 text-xs">
                pnpm tsx scripts/seed-email-variants.ts
              </code>{" "}
              pour les générer.
            </p>
          </CardContent>
        </Card>
      )}

      {steps.map((step) => (
        <section key={step} className="space-y-3">
          <h2 className="text-lg font-semibold">
            Step {step} — {STEP_LABELS[step] ?? `Étape ${step}`}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {byStep.get(step)!.map((v) => {
              const openR = v.sent > 0 ? (v.opened / v.sent) * 100 : 0;
              const clickR = v.sent > 0 ? (v.clicked / v.sent) * 100 : 0;
              return (
                <Card key={String(v.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-mono text-lg">
                        Variant {v.variant}
                      </CardTitle>
                      <Badge
                        variant={v.active ? "default" : "secondary"}
                      >
                        {v.generatedBy}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-sm">
                      <strong>{v.subject}</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                      <Stat label="Envoyés" value={v.sent.toString()} />
                      <Stat label="Open" value={`${openR.toFixed(0)}%`} />
                      <Stat label="Click" value={`${clickR.toFixed(0)}%`} />
                    </div>
                    <VariantPreview
                      subject={v.subject}
                      bodyHtml={v.bodyHtml}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
