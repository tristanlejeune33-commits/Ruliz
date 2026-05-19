import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MailOpen,
  MessageCircle,
  MousePointerClick,
  Sparkles,
  ThumbsDown,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Workflow campagne · Admin Outreach",
};

const DEFAULT_CAMPAIGN = "pilote-2k-2026-05";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function JourneyPage({ searchParams }: PageProps) {
  await ensureRuntimeSchema();
  const { campaign: campaignParam } = await searchParams;
  const campaign = campaignParam ?? DEFAULT_CAMPAIGN;

  const [stats, replyStats] = await Promise.all([
    prisma.prospectRestaurant.groupBy({
      by: ["status"],
      where: { source: campaign },
      _count: { _all: true },
    }),
    prisma.outreachEvent.findMany({
      where: {
        type: "reply",
        prospect: { source: campaign },
      },
      select: { metadata: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const s of stats) counts.set(s.status, s._count._all);

  const replyCategoryCounts = new Map<string, number>();
  for (const ev of replyStats) {
    const meta = ev.metadata as Record<string, unknown> | null;
    const ai = meta?.aiClassification as { category?: string } | undefined;
    const cat = ai?.category ?? "unknown";
    replyCategoryCounts.set(cat, (replyCategoryCounts.get(cat) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/admin/outreach?campaign=${campaign}`}>
            <ArrowLeft className="size-3.5" />
            Retour à la campagne
          </Link>
        </Button>
        <Badge variant="secondary">{campaign}</Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Workflow campagne
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Le parcours complet d&apos;un prospect — depuis l&apos;import CSV
          jusqu&apos;à la conversion en client Pro. Toutes les branches sont
          automatisées (incluant les réponses aux replies).
        </p>
      </header>

      {/* ═══ Phase 1 — Acquisition ═══ */}
      <Section
        number="1"
        title="Acquisition & Enrichissement"
        subtitle="Du CSV brut à la carte digitale personnalisée"
      >
        <StepRow>
          <StepCard
            icon={Mail}
            tone="slate"
            label="Import CSV"
            value={counts.get("queued") ?? 0}
            unit="prospects en file"
            desc="Upload 2000 prospects (email + nom + ville)"
          />
          <Arrow />
          <StepCard
            icon={Sparkles}
            tone="sky"
            label="Validation email"
            value={(counts.get("enriched") ?? 0) +
              (counts.get("generated") ?? 0) +
              (counts.get("sent") ?? 0) +
              (counts.get("opened") ?? 0) +
              (counts.get("clicked") ?? 0) +
              (counts.get("converted") ?? 0)}
            unit="emails validés"
            desc="DNS MX + filtre role-based + syntaxe RFC"
          />
          <Arrow />
          <StepCard
            icon={Sparkles}
            tone="violet"
            label="Scrape + OCR Anthropic"
            value={(counts.get("generated") ?? 0) +
              (counts.get("sent") ?? 0) +
              (counts.get("opened") ?? 0) +
              (counts.get("clicked") ?? 0) +
              (counts.get("converted") ?? 0)}
            unit="cartes générées"
            desc="Logo + menu → Anthropic Vision → cardJson"
          />
        </StepRow>
      </Section>

      {/* ═══ Phase 2 — Outreach ═══ */}
      <Section
        number="2"
        title="Outreach Smartlead — 4 steps × 4 variants"
        subtitle="Séquence A/B/C/D pour chaque step. Drip 200/jour. Bandit Thompson Sampling."
      >
        <div className="grid gap-3 lg:grid-cols-4">
          <SequenceStep
            day="J+0"
            title="Premier contact"
            variants={["Curiosité", "Provocation", "Bénéfice chiffré", "Story"]}
            sent={counts.get("sent") ?? 0}
          />
          <SequenceStep
            day="J+3"
            title="Relance soft"
            variants={["Soft follow", "Question", "Témoignage", "Direct"]}
            sent={counts.get("sent") ?? 0}
          />
          <SequenceStep
            day="J+7"
            title="Offre / Storytelling"
            variants={["1er mois gratuit", "Urgence FOMO", "Vulnérabilité", "Anecdote"]}
            sent={counts.get("sent") ?? 0}
          />
          <SequenceStep
            day="J+12"
            title="Breakup poli"
            variants={["Soft", "Sincère", "10€ offert", "Amical"]}
            sent={counts.get("sent") ?? 0}
          />
        </div>
      </Section>

      {/* ═══ Phase 3 — Réactions ═══ */}
      <Section
        number="3"
        title="Réactions prospect"
        subtitle="Tracking automatique via webhook Smartlead → /api/outreach/event"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReactionCard
            icon={MailOpen}
            tone="cyan"
            label="Ouverture"
            count={counts.get("opened") ?? 0}
            action="Statut → 'opened' (silent)"
          />
          <ReactionCard
            icon={MousePointerClick}
            tone="emerald"
            label="Click preview"
            count={counts.get("clicked") ?? 0}
            action="Statut → 'clicked' + tracking"
          />
          <ReactionCard
            icon={MessageCircle}
            tone="violet"
            label="Reply"
            count={replyStats.length}
            action="AI classifie + reply auto"
          />
          <ReactionCard
            icon={XCircle}
            tone="red"
            label="Bounce / Spam"
            count={counts.get("failed") ?? 0}
            action="Stop séquence immédiat"
          />
        </div>
      </Section>

      {/* ═══ Phase 4 — Reply auto ═══ */}
      <Section
        number="4"
        title="Reply auto humanisée (AI Marketer)"
        subtitle="Classification reply via Anthropic Haiku → template approprié → délai humain 2-30 min → envoi"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReplyBranch
            icon={CheckCircle2}
            tone="emerald"
            label="interested"
            count={replyCategoryCounts.get("interested") ?? 0}
            response="Envoi auto : « Yes super ! Tu peux activer ici → ... »"
          />
          <ReplyBranch
            icon={HelpCircle}
            tone="cyan"
            label="question"
            count={replyCategoryCounts.get("question") ?? 0}
            response="AI complète la réponse à la question + relance"
          />
          <ReplyBranch
            icon={Clock}
            tone="amber"
            label="not_now"
            count={replyCategoryCounts.get("not_now") ?? 0}
            response="« Pas de souci, je te recontacte dans 2-3 mois »"
          />
          <ReplyBranch
            icon={ThumbsDown}
            tone="orange"
            label="negative"
            count={replyCategoryCounts.get("negative") ?? 0}
            response="❌ Aucune réponse — stop séquence"
          />
          <ReplyBranch
            icon={UserX}
            tone="slate"
            label="unsubscribe"
            count={replyCategoryCounts.get("unsubscribe") ?? 0}
            response="❌ Stop + retire de la liste définitif"
          />
          <ReplyBranch
            icon={UserCheck}
            tone="sky"
            label="wrong_person"
            count={replyCategoryCounts.get("wrong_person") ?? 0}
            response="« Tu peux forwarder à la bonne personne ? »"
          />
        </div>
      </Section>

      {/* ═══ Phase 5 — Conversion ═══ */}
      <Section
        number="5"
        title="Conversion → Client Pro"
        subtitle="Le prospect clique preview → /signup?prospect=token → compte créé en 30s → email bienvenue"
      >
        <StepRow>
          <StepCard
            icon={MousePointerClick}
            tone="emerald"
            label="Click preview"
            value={counts.get("clicked") ?? 0}
            unit="clics CTA"
            desc="Voient leur carte digitale rendue mobile"
          />
          <Arrow />
          <StepCard
            icon={UserCheck}
            tone="emerald"
            label="Signup activé"
            value={counts.get("converted") ?? 0}
            unit="conversions"
            desc="Auto : Restaurant + Categorie + Produit créés"
          />
          <Arrow />
          <StepCard
            icon={CheckCircle2}
            tone="emerald"
            label="Email bienvenue"
            value={counts.get("converted") ?? 0}
            unit="envoyés"
            desc="Resend transactionnel + onboarding CTAs"
            highlight
          />
        </StepRow>
      </Section>

      {/* Légende & Réglages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilotage du workflow</CardTitle>
          <CardDescription>
            Tout est automatisé. Tu ne touches que le contenu (variants emails)
            et les paramètres campagne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/outreach/variants?campaign=${campaign}`}>
                <Mail className="size-3.5" />
                Editer les 16 variants
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/outreach/replies?campaign=${campaign}`}>
                <MessageCircle className="size-3.5" />
                Voir les replies AI-classifiées
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/outreach?campaign=${campaign}`}>
                <Sparkles className="size-3.5" />
                Funnel temps réel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers de rendu ──────────────────────────────────────────────────────

function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)]/15 font-mono text-xs font-bold text-[var(--accent)]">
            {number}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="ml-10">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StepRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex shrink-0 items-center justify-center text-[var(--text-muted)]">
      <ArrowRight className="size-5 rotate-90 lg:rotate-0" />
    </div>
  );
}

function StepCard({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  desc,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "slate" | "sky" | "violet" | "amber" | "cyan" | "emerald" | "red";
  label: string;
  value: number;
  unit: string;
  desc: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    slate: "border-slate-500/20 bg-slate-500/5 text-slate-300",
    sky: "border-sky-500/20 bg-sky-500/5 text-sky-300",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-300",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    red: "border-red-500/20 bg-red-500/5 text-red-300",
  };
  return (
    <div
      className={`flex-1 rounded-lg border p-4 ${colorMap[tone]} ${
        highlight ? "ring-2 ring-emerald-500/30" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs opacity-60">{unit}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{desc}</p>
    </div>
  );
}

function SequenceStep({
  day,
  title,
  variants,
  sent,
}: {
  day: string;
  title: string;
  variants: string[];
  sent: number;
}) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-amber-300">{day}</span>
        <Badge variant="secondary" className="text-[10px]">
          {sent} envoyés
        </Badge>
      </div>
      <h3 className="mt-1 text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-1">
        {variants.map((v, i) => (
          <li
            key={v}
            className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
          >
            <span className="font-mono text-amber-300">
              {String.fromCharCode(65 + i)}
            </span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReactionCard({
  icon: Icon,
  tone,
  label,
  count,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "emerald" | "violet" | "red";
  label: string;
  count: number;
  action: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-300",
    red: "border-red-500/20 bg-red-500/5 text-red-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">→ {action}</p>
    </div>
  );
}

function ReplyBranch({
  icon: Icon,
  tone,
  label,
  count,
  response,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "cyan" | "amber" | "orange" | "slate" | "sky";
  label: string;
  count: number;
  response: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    orange: "border-orange-500/20 bg-orange-500/5 text-orange-300",
    slate: "border-slate-500/20 bg-slate-500/5 text-slate-300",
    sky: "border-sky-500/20 bg-sky-500/5 text-sky-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4" />
          <span className="font-mono text-xs font-semibold">{label}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {count}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">{response}</p>
    </div>
  );
}
