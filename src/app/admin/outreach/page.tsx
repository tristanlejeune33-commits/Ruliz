import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Globe2,
  Mail,
  MailCheck,
  MailOpen,
  Megaphone,
  MousePointerClick,
  Sparkles,
  Users,
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
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import {
  getOutreachStats,
  listCampaigns,
  listProspects,
} from "@/server/admin/outreach-queries";
import { serialize } from "@/lib/serialize";

// Toujours frais : la campagne évolue en temps réel pendant l'enrichissement.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Campagne outreach · Admin Ruliz",
};

const DEFAULT_CAMPAIGN = "pilote-2k-2026-05";

interface PageProps {
  searchParams: Promise<{
    campaign?: string;
    status?: string;
    page?: string;
    q?: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  queued: { label: "En attente", tone: "bg-slate-500/15 text-slate-300" },
  enriched: { label: "Enrichi", tone: "bg-sky-500/15 text-sky-300" },
  generated: { label: "Carte prête", tone: "bg-violet-500/15 text-violet-300" },
  sent: { label: "Envoyé", tone: "bg-amber-500/15 text-amber-300" },
  opened: { label: "Ouvert", tone: "bg-cyan-500/15 text-cyan-300" },
  clicked: { label: "Cliqué", tone: "bg-emerald-500/15 text-emerald-300" },
  converted: { label: "🎉 Converti", tone: "bg-emerald-600/25 text-emerald-200" },
  failed: { label: "Échec", tone: "bg-red-500/15 text-red-300" },
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminOutreachPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const campaign = params.campaign ?? DEFAULT_CAMPAIGN;
  const status = params.status ?? "all";
  const search = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const [stats, campaignsList, prospectsRaw] = await Promise.all([
    getOutreachStats(campaign),
    listCampaigns(),
    listProspects({ campaign, status, search, limit, offset }),
  ]);

  const prospects = serialize(prospectsRaw.items);
  const totalPages = Math.max(1, Math.ceil(prospectsRaw.total / limit));

  const progressPct = stats.total > 0
    ? Math.round(((stats.counts.sent + stats.counts.opened + stats.counts.clicked + stats.counts.converted) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <PageHero
        accent="violet"
        eyebrow={
          <>
            <HeroEyebrow icon={<Megaphone className="size-3" />}>
              Campagne outreach
            </HeroEyebrow>
            <Badge variant="secondary">{campaign}</Badge>
          </>
        }
        title={`${stats.total} prospects dans la séquence`}
        description="Pipeline d'acquisition cold-email avec cartes pré-générées. Track temps réel des ouvertures, clics et conversions."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/outreach/variants">
                <Sparkles className="size-3.5" />
                Variants emails
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/outreach/upload">
                <Users className="size-3.5" />
                Importer prospects
              </Link>
            </Button>
          </div>
        }
        kpis={
          <>
            <HeroKpi
              label="Progression"
              value={
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  {progressPct}%
                  <span className="text-xs text-[var(--text-muted)]">
                    ({stats.counts.sent + stats.counts.opened + stats.counts.clicked + stats.counts.converted} envoyés)
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="Conversions"
              value={
                <span className="text-sm font-medium text-emerald-300">
                  {stats.counts.converted ?? 0}
                  <span className="ml-1 text-xs text-[var(--text-muted)]">
                    ({pct(stats.rates.conversion)})
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="Open rate"
              value={
                <span className="text-sm font-medium">
                  {pct(stats.rates.open)}
                </span>
              }
            />
            <HeroKpi
              label="Click rate"
              value={
                <span className="text-sm font-medium">
                  {pct(stats.rates.click)}
                </span>
              }
            />
          </>
        }
      />

      {/* Pipeline funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline en temps réel</CardTitle>
          <CardDescription>
            Les prospects avancent : queued → enriched → generated → sent → opened → clicked → converted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <FunnelTile icon={Users} label="Queued" value={stats.counts.queued} tone="slate" />
            <FunnelTile icon={Globe2} label="Enrichi" value={stats.counts.enriched} tone="sky" />
            <FunnelTile icon={Sparkles} label="Carte prête" value={stats.counts.generated} tone="violet" />
            <FunnelTile icon={Mail} label="Envoyé" value={stats.counts.sent} tone="amber" />
            <FunnelTile icon={MailOpen} label="Ouvert" value={stats.counts.opened} tone="cyan" />
            <FunnelTile icon={MousePointerClick} label="Cliqué" value={stats.counts.clicked} tone="emerald" />
            <FunnelTile icon={CheckCircle2} label="Converti" value={stats.counts.converted} tone="emerald" highlight />
            <FunnelTile icon={XCircle} label="Échec" value={stats.counts.failed} tone="red" />
          </div>
        </CardContent>
      </Card>

      {/* Variants performance */}
      {stats.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variants emails — performance</CardTitle>
            <CardDescription>
              A/B test des sujets et corps de mails. Le bandit Thompson Sampling
              favorise progressivement les meilleurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Step</th>
                    <th className="px-3 py-2 text-left">Variant</th>
                    <th className="px-3 py-2 text-left">Sujet</th>
                    <th className="px-3 py-2 text-right">Envoyés</th>
                    <th className="px-3 py-2 text-right">Open</th>
                    <th className="px-3 py-2 text-right">Click</th>
                    <th className="px-3 py-2 text-right">Reply</th>
                    <th className="px-3 py-2 text-right">Convert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {stats.variants.map((v) => {
                    const openR = v.sent > 0 ? v.opened / v.sent : 0;
                    const clickR = v.sent > 0 ? v.clicked / v.sent : 0;
                    const convR = v.sent > 0 ? v.converted / v.sent : 0;
                    return (
                      <tr key={String(v.id)}>
                        <td className="px-3 py-2 text-[var(--text-muted)]">
                          J+{v.step === 1 ? "0" : v.step === 2 ? "3" : v.step === 3 ? "7" : "14"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{v.variant}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate">{v.subject}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{v.sent}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(openR)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(clickR)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{v.replied}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{pct(convR)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top villes */}
      {stats.villes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 villes représentées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {stats.villes.map((v) => (
                <div
                  key={v.ville}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                >
                  <p className="truncate text-sm font-medium">{v.ville}</p>
                  <p className="text-xs text-[var(--text-muted)]">{v.count} restos</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres + liste prospects */}
      <Card>
        <CardHeader className="flex-row items-end justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Prospects de la campagne</CardTitle>
            <CardDescription>
              {prospectsRaw.total} prospects · page {page}/{totalPages}
            </CardDescription>
          </div>
          <form className="flex gap-2" method="GET">
            <input type="hidden" name="campaign" value={campaign} />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Email ou nom…"
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm"
            >
              <option value="all">Tous statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Filtrer
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">Restaurant</th>
                  <th className="px-3 py-2 text-left">Ville</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-right">Rating</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {prospects.map((p) => {
                  const stLabel = STATUS_LABELS[p.status] ?? {
                    label: p.status,
                    tone: "bg-slate-500/15 text-slate-300",
                  };
                  return (
                    <tr key={String(p.id)} className="hover:bg-[var(--bg-elevated)]/50">
                      <td className="px-3 py-2 font-medium">{p.nom}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">{p.ville ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.email}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.rating ? `${p.rating}★` : "—"}
                        <span className="ml-1 text-xs text-[var(--text-muted)]">
                          ({p.nbReviews ?? 0})
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${stLabel.tone}`}>
                          {stLabel.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.cardToken ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/preview/${p.cardToken}`} target="_blank" rel="noreferrer">
                              <Eye className="size-3.5" />
                              Preview
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {prospects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">
                      Aucun prospect ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-between text-sm text-[var(--text-muted)]">
              <span>
                {offset + 1}–{Math.min(offset + limit, prospectsRaw.total)} sur {prospectsRaw.total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/admin/outreach?campaign=${campaign}&status=${status}&q=${search}&page=${page - 1}`}
                    >
                      ← Précédent
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/admin/outreach?campaign=${campaign}&status=${status}&q=${search}&page=${page + 1}`}
                    >
                      Suivant →
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste autres campagnes */}
      {campaignsList.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Autres campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {campaignsList.map((c) => (
                <Button
                  key={c.source}
                  asChild
                  size="sm"
                  variant={c.source === campaign ? "default" : "outline"}
                >
                  <Link href={`/admin/outreach?campaign=${c.source}`}>
                    <MailCheck className="size-3.5" />
                    {c.source} ({c.count})
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FunnelTile({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "slate" | "sky" | "violet" | "amber" | "cyan" | "emerald" | "red";
  highlight?: boolean;
}) {
  const colorMap = {
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
      className={`rounded-lg border p-3 ${colorMap[tone]} ${
        highlight ? "ring-2 ring-emerald-500/30" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
