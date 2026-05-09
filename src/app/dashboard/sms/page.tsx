import type { Metadata } from "next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Phone, Users } from "lucide-react";
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
import { isBrevoConfigured } from "@/lib/brevo";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { SmsBlastForm } from "./sms-blast-form";

export const metadata: Metadata = {
  title: "SMS marketing · Ruliz",
};

export default async function SmsPage() {
  const { restaurant } = await getCurrentRestaurant();

  const baseClients = await prisma.baseClient.findMany({
    where: {
      restaurantId: restaurant.id,
      telephone: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalWithPhone = await prisma.baseClient.count({
    where: { restaurantId: restaurant.id, telephone: { not: null } },
  });

  return (
    <div className="space-y-6">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<MessageSquare className="size-3" strokeWidth={1.75} />}>
            SMS marketing
          </HeroEyebrow>
        }
        title="Relance ta base client"
        description="Annonce un événement, une fermeture, une promo. Conforme RGPD : la base est constituée d'opt-ins via la roulette d'avis."
        kpis={
          <HeroKpi
            label="Contacts SMS"
            value={<span className="tabular-nums">{totalWithPhone}</span>}
          />
        }
      />

      <PlanLock
        currentPlan={restaurant.plan}
        requiredPlan="premium"
        title="Le SMS marketing est inclus dans Premium"
        description="Capte les coordonnées via la roulette puis envoie un SMS à toute ta base. Idéal pour booster ton remplissage."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
              <CardDescription>Contacts SMS</CardDescription>
              <Users className="size-4 text-[var(--text-muted)]" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl tabular-nums">{totalWithPhone}</CardTitle>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Clients avec téléphone
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Brevo</CardTitle>
                {isBrevoConfigured() ? (
                  <Badge variant="success">Connecté</Badge>
                ) : (
                  <Badge variant="destructive">Non configuré</Badge>
                )}
              </div>
              <CardDescription>
                Setup : créer un compte sur brevo.com → API keys → ajouter{" "}
                <code className="font-mono">BREVO_API_KEY</code> et{" "}
                <code className="font-mono">BREVO_SMS_SENDER</code> en env.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Composer un envoi</CardTitle>
            <CardDescription>
              Variable disponible : <code className="font-mono">{"{{prenom}}"}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmsBlastForm
              restaurantId={restaurant.id.toString()}
              configured={isBrevoConfigured()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers contacts</CardTitle>
            <CardDescription>10 plus récents avec téléphone</CardDescription>
          </CardHeader>
          <CardContent>
            {baseClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucun contact SMS pour l&apos;instant. Active la roulette pour en collecter.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {baseClients.map((c) => (
                  <li key={c.id.toString()} className="flex items-center gap-3 py-2.5">
                    <Phone className="size-3.5 text-[var(--text-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.prenom ?? "—"}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)]">
                        {c.telephone}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {format(c.createdAt, "d MMM yyyy", { locale: fr })}
                    </span>
                    <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
                      {c.source ?? "—"}
                    </span>
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
