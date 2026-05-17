import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircle,
  ShieldAlert,
  ThumbsDown,
  UserX,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Replies outreach · Admin",
};

const CATEGORY_META: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  interested: { label: "Intéressé", icon: CheckCircle2, tone: "text-emerald-300 bg-emerald-500/10" },
  question: { label: "Question", icon: HelpCircle, tone: "text-cyan-300 bg-cyan-500/10" },
  not_now: { label: "Pas maintenant", icon: Clock, tone: "text-amber-300 bg-amber-500/10" },
  negative: { label: "Refus", icon: ThumbsDown, tone: "text-orange-300 bg-orange-500/10" },
  unsubscribe: { label: "Désabonnement", icon: UserX, tone: "text-slate-300 bg-slate-500/10" },
  out_of_office: { label: "OOO", icon: Clock, tone: "text-slate-300 bg-slate-500/10" },
  wrong_person: { label: "Mauvaise personne", icon: UserX, tone: "text-slate-300 bg-slate-500/10" },
  spam_complaint: { label: "Spam complaint", icon: ShieldAlert, tone: "text-red-300 bg-red-500/10" },
  unknown: { label: "Non classifié", icon: MessageCircle, tone: "text-slate-300 bg-slate-500/10" },
};

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function RepliesPage({ searchParams }: PageProps) {
  await ensureRuntimeSchema();
  const { campaign: campaignParam } = await searchParams;
  const campaign = campaignParam ?? "pilote-2k-2026-05";

  // On joint OutreachEvent (type=reply) avec ProspectRestaurant
  const replies = await prisma.outreachEvent.findMany({
    where: {
      type: "reply",
      prospect: { source: campaign },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      prospect: {
        select: {
          id: true,
          email: true,
          nom: true,
          ville: true,
          status: true,
          cardToken: true,
        },
      },
    },
  });

  const items = serialize(replies);

  // Compteurs par catégorie
  const counts = new Map<string, number>();
  for (const r of items) {
    const meta = r.metadata as Record<string, unknown> | null;
    const ai = meta?.aiClassification as { category?: string } | undefined;
    const cat = ai?.category ?? "unknown";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

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
            <MessageCircle className="size-3" />
            {items.length} replies
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Réponses prospects (AI-classifiées)
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Toutes les replies reçues via Smartlead, classifiées automatiquement
            par Anthropic Haiku.
          </p>
        </div>
      </header>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {[
          "interested",
          "question",
          "not_now",
          "negative",
          "unsubscribe",
          "spam_complaint",
          "out_of_office",
          "wrong_person",
          "unknown",
        ].map((cat) => {
          const meta = CATEGORY_META[cat] ?? CATEGORY_META.unknown!;
          const Icon = meta.icon;
          const count = counts.get(cat) ?? 0;
          return (
            <div
              key={cat}
              className={`rounded-lg p-3 ${meta.tone}`}
            >
              <Icon className="size-4 opacity-80" />
              <p className="mt-2 text-xs uppercase tracking-wide opacity-80">
                {meta.label}
              </p>
              <p className="text-xl font-semibold tabular-nums">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Liste détaillée */}
      <div className="space-y-3">
        {items.map((r) => {
          const meta = r.metadata as Record<string, unknown> | null;
          const ai = meta?.aiClassification as
            | {
                category?: string;
                confidence?: number;
                shouldReply?: boolean;
                replyText?: string | null;
                reasoning?: string;
              }
            | undefined;
          const replyText = meta?.replyText as string | undefined;
          const cat = ai?.category ?? "unknown";
          const catMeta = CATEGORY_META[cat] ?? CATEGORY_META.unknown!;
          const Icon = catMeta.icon;

          return (
            <Card key={String(r.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${catMeta.tone.split(" ")[0]}`} />
                    <CardTitle className="text-base">
                      {r.prospect.nom}
                      <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                        {r.prospect.ville ?? "—"} · {r.prospect.email}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${catMeta.tone}`}
                    >
                      {catMeta.label}
                      {ai?.confidence !== undefined && (
                        <span className="opacity-60">
                          ({Math.round(ai.confidence * 100)}%)
                        </span>
                      )}
                    </span>
                    {r.prospect.cardToken && (
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={`/preview/${r.prospect.cardToken}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview →
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {replyText && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      Réponse reçue
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-sm">
                      {replyText}
                    </p>
                  </div>
                )}
                {ai?.reasoning && (
                  <p className="text-xs text-[var(--text-muted)]">
                    <strong>AI :</strong> {ai.reasoning}
                  </p>
                )}
                {ai?.shouldReply && ai.replyText && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-400">
                      💬 Réponse suggérée par l'IA
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                      {ai.replyText}
                    </p>
                  </div>
                )}
                {ai && !ai.shouldReply && (
                  <p className="text-xs text-[var(--text-muted)]">
                    <XCircle className="mr-1 inline size-3" />
                    L'IA ne suggère pas de réponse pour ce cas.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--text-muted)]">
              Aucune réponse reçue pour cette campagne pour l'instant.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
