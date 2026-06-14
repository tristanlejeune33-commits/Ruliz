import type { Metadata } from "next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MessageSquare,
  Phone,
  Users,
  Coins,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroEyebrow, HeroKpi, PageHero } from "@/components/shared/page-hero";
import { PlanLock } from "@/components/shared/plan-lock";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getEffectivePlan } from "@/lib/plan-gate";
import { prisma } from "@/lib/db";
import {
  getDefaultSmsSender,
  getSmsBalance,
  listSmsAutomations,
  listSmsCampaigns,
} from "@/server/dashboard/sms-actions";
import { listManualClients } from "@/server/dashboard/clients-actions";
import { getActiveSmsPacks } from "@/server/dashboard/sms-packs";
import { SmsBalanceCard } from "./sms-balance-card";
import { SmsPacksList } from "./sms-packs-list";
import { SmsBlastForm } from "./sms-blast-form";
import { SmsAutomationsList } from "./sms-automations-list";
import { SmsHistoryList } from "./sms-history-list";

export const metadata: Metadata = {
  title: "SMS marketing Ruliz",
};

interface PageProps {
  searchParams: Promise<{ purchase?: string }>;
}

export default async function SmsPage({ searchParams }: PageProps) {
  const { restaurant } = await getCurrentRestaurant();
  const { purchase } = await searchParams;

  const restaurantId = restaurant.id.toString();

  const [
    balance,
    baseClients,
    totalWithPhone,
    automations,
    campaigns,
    packs,
    defaultSender,
    manualClients,
  ] = await Promise.all([
    getSmsBalance(restaurantId),
    prisma.baseClient.findMany({
      where: {
        restaurantId: restaurant.id,
        telephone: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.baseClient.count({
      where: { restaurantId: restaurant.id, telephone: { not: null } },
    }),
    listSmsAutomations(restaurantId),
    listSmsCampaigns(restaurantId, 10),
    getActiveSmsPacks(),
    getDefaultSmsSender(restaurantId),
    listManualClients(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<MessageSquare className="size-3" strokeWidth={1.75} />}>
            SMS marketing
          </HeroEyebrow>
        }
        title="Envoie des SMS à tes clients"
        description="Annonce un événement, une fermeture, une promo. Personnalise avec {prenom}, {nom}. Conforme RGPD : seuls les clients qui ont accepté reçoivent."
        kpis={
          <>
            <HeroKpi
              label="Contacts SMS"
              value={<span className="tabular-nums">{totalWithPhone}</span>}
            />
            <HeroKpi
              label="Crédit SMS"
              value={
                <span className="tabular-nums">{balance.balance}</span>
              }
            />
          </>
        }
      />

      <PlanLock
        currentPlan={getEffectivePlan(restaurant)}
        requiredPlan="premium"
        title="Le SMS marketing est inclus dans Premium"
        description="Récupère les coordonnées de tes clients via la roulette, puis envoie-leur un SMS pour les faire revenir. Idéal pour remplir tes services creux."
      >
        {/* Toast de succès post-achat (afficher juste un texte simple) */}
        {purchase === "success" && (
          <Card className="border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)]/30">
            <CardContent className="flex items-center gap-3 py-3">
              <Coins className="size-5 text-[var(--neon-success)]" />
              <div>
                <p className="font-semibold">Paiement reçu ! Tes SMS sont créditées.</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Si ton solde n&apos;a pas encore bougé, rafraîchis la page dans
                  quelques secondes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ SOLDE ============ */}
        <SmsBalanceCard
          balance={balance.balance}
          totalAcquired={balance.totalAcquired}
          totalSpent={balance.totalSpent}
        />

        {/* ============ ACHAT DE PACKS ============ */}
        <Card>
          <CardHeader>
            <CardTitle>Acheter un pack de SMS</CardTitle>
            <CardDescription>
              Plus tu achètes en gros, moins c&apos;est cher. Crédits non
              expirables, paiement sécurisé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmsPacksList
              restaurantId={restaurantId}
              packs={packs.map((p) => ({
                id: p.id,
                size: p.size,
                priceCentimes: p.priceCentimes,
                label: p.label,
                badge: p.badge,
              }))}
            />
          </CardContent>
        </Card>

        {/* ============ COMPOSER UN ENVOI ============ */}
        <Card>
          <CardHeader>
            <CardTitle>Envoyer un SMS</CardTitle>
            <CardDescription>
              Tape ton message. Utilise{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1 font-mono text-xs">
                {"{prenom}"}
              </code>
              ,{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1 font-mono text-xs">
                {"{nom}"}
              </code>{" "}
              ou{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1 font-mono text-xs">
                {"{resto}"}
              </code>{" "}
              pour personnaliser. L&apos;estimation du coût s&apos;affiche en
              direct.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmsBlastForm
              restaurantId={restaurantId}
              currentBalance={balance.balance}
              defaultSender={defaultSender}
              manualClients={manualClients}
            />
          </CardContent>
        </Card>

        {/* ============ AUTOMATISATIONS ============ */}
        <Card>
          <CardHeader>
            <CardTitle>Automatisations</CardTitle>
            <CardDescription>
              Envois automatiques qui tournent tous seuls. Idéal pour les
              anniversaires et les relances d&apos;avis Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmsAutomationsList
              restaurantId={restaurantId}
              automations={automations}
            />
          </CardContent>
        </Card>

        {/* ============ HISTORIQUE ============ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historique des envois</CardTitle>
                <CardDescription>
                  10 dernières campagnes envoyées.
                </CardDescription>
              </div>
              <History className="size-4 text-[var(--text-muted)]" />
            </div>
          </CardHeader>
          <CardContent>
            <SmsHistoryList campaigns={campaigns} />
          </CardContent>
        </Card>

        {/* ============ DERNIERS CONTACTS ============ */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers contacts collectés</CardTitle>
            <CardDescription>
              10 contacts les plus récents avec téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {baseClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucun contact pour l&apos;instant. Active la roulette d&apos;avis
                pour en collecter.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {baseClients.map((c) => (
                  <li
                    key={c.id.toString()}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Phone className="size-3.5 text-[var(--text-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {c.prenom ?? "Sans prénom"}
                      </p>
                      <p className="font-mono text-xs text-[var(--text-muted)]">
                        {c.telephone}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {format(c.createdAt, "d MMM yyyy", { locale: fr })}
                    </span>
                    <Badge variant="secondary">
                      <Users className="size-2.5" />
                      {c.source ?? "Inconnu"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PlanLock>
    </div>
  );
}
