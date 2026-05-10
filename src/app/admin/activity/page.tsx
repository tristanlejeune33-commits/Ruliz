import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ActivitySquare,
  Package,
  ScanLine,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Activité · Admin Ruliz",
};

/**
 * Page /admin/activity — flux d'activité temps réel : derniers signups,
 * dernières commandes boutique, derniers scans QR notables. Vue compacte
 * pour avoir un pouls instantané du SaaS.
 */
export default async function AdminActivityPage() {
  await requireAdmin();

  const [recentUsers, recentCommandes, recentJeux] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        createdAt: true,
        role: true,
      },
    }),
    prisma.boutiqueCommande.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, email: true, prenom: true, nom: true } },
      },
    }),
    prisma.jeuParticipation.findMany({
      orderBy: { participatedAt: "desc" },
      take: 20,
      include: {
        jeu: {
          select: {
            id: true,
            nom: true,
            restaurant: {
              select: { id: true, nom: true, userId: true },
            },
          },
        },
      },
    }),
  ]);

  // Top-level KPIs
  const last24h = Date.now() - 24 * 3600 * 1000;
  const newUsers24h = recentUsers.filter(
    (u) => u.createdAt.getTime() > last24h,
  ).length;
  const newCommandes24h = recentCommandes.filter(
    (c) => c.createdAt.getTime() > last24h,
  ).length;
  const newParticipations24h = recentJeux.filter(
    (p) => p.participatedAt.getTime() > last24h,
  ).length;

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow
            icon={<ActivitySquare className="size-3" strokeWidth={1.75} />}
          >
            Live feed
          </HeroEyebrow>
        }
        title="Activité du SaaS"
        description="Pouls temps réel : derniers signups, dernières commandes boutique, dernières participations roulette. Cap à 20 par flux."
        kpis={
          <>
            <HeroKpi
              label="Nouveaux 24h"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus
                    className="size-3.5 text-[var(--neon-cyan)]"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums">{newUsers24h}</span>
                </span>
              }
            />
            <HeroKpi
              label="BC 24h"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Package
                    className="size-3.5 text-[var(--neon-violet)]"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums">{newCommandes24h}</span>
                </span>
              }
            />
            <HeroKpi
              label="Roulette 24h"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles
                    className="size-3.5 text-[var(--neon-success)]"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums">{newParticipations24h}</span>
                </span>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <FeedCard
          title="Derniers signups"
          icon={<UserPlus className="size-4" strokeWidth={1.75} />}
          tone="cyan"
        >
          {recentUsers.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {recentUsers.map((u) => {
                const fullName =
                  [u.prenom, u.nom].filter(Boolean).join(" ") || u.email;
                return (
                  <li key={u.id} className="px-3 py-2.5">
                    <Link
                      href={`/admin/clients/${u.id}`}
                      className="block hover:bg-[var(--bg-glass-hover)]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {fullName}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">
                          {formatDistanceToNow(u.createdAt, {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                        {u.email}
                        {u.role === "admin" && (
                          <span className="ml-1 rounded border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-1 font-mono text-[9px] uppercase text-[var(--neon-violet)]">
                            Admin
                          </span>
                        )}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </FeedCard>

        <FeedCard
          title="Dernières commandes BC"
          icon={<Package className="size-4" strokeWidth={1.75} />}
          tone="violet"
        >
          {recentCommandes.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {recentCommandes.map((c) => {
                const fullName =
                  [c.user.prenom, c.user.nom].filter(Boolean).join(" ") ||
                  c.user.email;
                return (
                  <li key={c.id.toString()} className="px-3 py-2.5">
                    <Link
                      href={`/admin/clients/${c.user.id}`}
                      className="block hover:bg-[var(--bg-glass-hover)]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {fullName}
                        </p>
                        <span className="shrink-0 font-mono text-[11px] text-[var(--text-primary)] tabular-nums">
                          {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                            style: "currency",
                            currency: c.devise,
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Statut {c.statut} ·{" "}
                        {formatDistanceToNow(c.createdAt, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </FeedCard>

        <FeedCard
          title="Dernières roulettes"
          icon={<Sparkles className="size-4" strokeWidth={1.75} />}
          tone="success"
        >
          {recentJeux.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {recentJeux.map((p) => (
                <li key={p.id.toString()} className="px-3 py-2.5">
                  {p.jeu.restaurant ? (
                    <Link
                      href={`/admin/clients/${p.jeu.restaurant.userId}`}
                      className="block hover:bg-[var(--bg-glass-hover)]"
                    >
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {p.email ?? p.telephone ?? "Anonyme"}
                      </p>
                      <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                        {p.jeu.restaurant.nom} ·{" "}
                        {formatDistanceToNow(p.participatedAt, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </Link>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {p.email ?? p.telephone ?? "Anonyme"}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {formatDistanceToNow(p.participatedAt, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </FeedCard>
      </div>
    </div>
  );
}

function FeedCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "cyan" | "violet" | "success";
  children: React.ReactNode;
}) {
  const TONE: Record<typeof tone, string> = {
    cyan: "text-[var(--neon-cyan)]",
    violet: "text-[var(--neon-violet)]",
    success: "text-[var(--neon-success)]",
  };
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass-strong)] px-3 py-2">
        <span className={TONE[tone]}>{icon}</span>
        <h2 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      {children}
    </Card>
  );
}

function Empty() {
  return (
    <div className="px-3 py-8 text-center">
      <ScanLine
        className="mx-auto size-6 text-[var(--text-tertiary)]"
        strokeWidth={1.5}
      />
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
        Aucune activité récente.
      </p>
    </div>
  );
}
