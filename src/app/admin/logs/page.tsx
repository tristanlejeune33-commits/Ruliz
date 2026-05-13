import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History, ScrollText, User as UserIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Logs · Admin Ruliz",
};

/**
 * Page /admin/logs · audit trail global de toutes les actions admin/client
 * loguées via `prisma.log.create()`. Cap à 200 derniers événements ; pour
 * historique complet, query directe en DB.
 */
export default async function AdminLogsPage() {
  await requireAdmin();

  const logs = await prisma.log.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { id: true, email: true, prenom: true, nom: true },
      },
    },
  });

  const totalLast24h = logs.filter(
    (l) => Date.now() - l.createdAt.getTime() < 24 * 3600 * 1000,
  ).length;

  return (
    <div className="space-y-6">
      <PageHero
        accent="violet"
        eyebrow={
          <HeroEyebrow
            tone="violet"
            icon={<ScrollText className="size-3" strokeWidth={1.75} />}
          >
            Audit trail
          </HeroEyebrow>
        }
        title="Logs système"
        description="Audit trail centralisé : actions admin (création client, changement de plan, impersonation), actions critiques système. Cap à 200 derniers événements."
        kpis={
          <>
            <HeroKpi label="Total" value={<span className="tabular-nums">{logs.length}</span>} />
            <HeroKpi
              label="Dernières 24h"
              value={<span className="tabular-nums">{totalLast24h}</span>}
            />
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="mx-auto size-10 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Aucun log enregistré pour le moment.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {logs.map((log) => {
              const userLabel = log.user
                ? [log.user.prenom, log.user.nom].filter(Boolean).join(" ") ||
                  log.user.email
                : "Système";
              return (
                <li
                  key={log.id.toString()}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-glass-strong)] text-[var(--text-secondary)]">
                    <History className="size-3.5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                        {log.action ?? "·"}
                      </span>
                      {log.user ? (
                        <Link
                          href={`/admin/clients/${log.user.id}`}
                          className="inline-flex items-center gap-1 text-xs text-[var(--neon-cyan)] hover:underline"
                        >
                          <UserIcon className="size-3" strokeWidth={1.75} />
                          {userLabel}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <UserIcon className="size-3" strokeWidth={1.75} />
                          {userLabel}
                        </span>
                      )}
                    </div>
                    {log.details !== null && (
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-[var(--bg-glass)]/50 px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]">
                        {JSON.stringify(log.details, null, 0)}
                      </pre>
                    )}
                    {log.ip && (
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
                        IP {log.ip}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--text-tertiary)]">
                    {format(log.createdAt, "d MMM HH:mm:ss", { locale: fr })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
