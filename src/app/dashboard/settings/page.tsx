import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  GraduationCap,
  Plug,
  Receipt,
  Settings as SettingsIcon,
  Users,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { RestartTourButton } from "./restart-tour-button";

export const metadata: Metadata = {
  title: "Paramètres · Ruliz",
};

export default async function SettingsPage() {
  const { session, restaurant } = await getCurrentRestaurant();

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="secondary">
          <SettingsIcon className="size-3" /> Paramètres
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gère ton profil, ton équipe, ta facturation et tes intégrations.
        </p>
      </header>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="equipe">
            <Users className="size-3.5" /> Équipe
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="size-3.5" /> Facturation
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="size-3.5" /> Intégrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mon compte</CardTitle>
              <CardDescription>
                Coordonnées de connexion. Le changement d&apos;email sera
                disponible bientôt.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" value={session.user.name ?? "—"} />
              <Field label="Email" value={session.user.email} />
            </CardContent>
          </Card>

          {/* Didacticiel / Tour guidé — relance la bulle d'onboarding */}
          <Card className="lift-hover">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                  <GraduationCap className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <CardTitle>Didacticiel</CardTitle>
                  <CardDescription className="mt-1">
                    Relance le petit tour guidé qui t&apos;explique comment
                    mettre ta carte en ligne — utile si tu as zappé la 1ère
                    fois ou si tu veux le montrer à un collègue.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RestartTourButton />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <CardTitle>Équipe</CardTitle>
              <CardDescription>
                Invite tes collaborateurs à éditer la carte depuis l&apos;onglet
                dédié.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/team">
                  Gérer l&apos;équipe
                  <ArrowRight className="size-3.5" strokeWidth={1.75} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          {/* Plan actuel — résumé + lien vers /dashboard/billing */}
          <Card className="lift-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Plan actuel</CardTitle>
                  <CardDescription>
                    Géré par Stripe — résiliation et upgrade à tout moment.
                  </CardDescription>
                </div>
                <PlanBadge plan={restaurant.plan as Plan} />
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/billing">
                  Gérer mon abonnement
                  <ArrowRight className="size-3.5" strokeWidth={1.75} />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Mes commandes & factures — nouveau lien voyant */}
          <Card className="lift-hover">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30">
                    <Receipt className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <CardTitle>Mes commandes & factures</CardTitle>
                    <CardDescription className="mt-1">
                      Historique complet : bons de commande boutique
                      téléchargeables + factures Stripe d&apos;abonnement.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="primary">
                <Link href="/dashboard/settings/factures">
                  Voir mes commandes & factures
                  <ArrowRight className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Google Reviews</CardTitle>
                <CardDescription>
                  Lien Google utilisé par le jeu roulette. À configurer dans la
                  fiche restaurant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/dashboard/restaurant">
                    Configurer dans le restaurant
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anthropic Claude (traduction IA)</CardTitle>
                <CardDescription>
                  Géré côté plateforme. La carte est traduite en arrière-plan
                  dans 7 langues.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  Aucune action requise.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMS marketing</CardTitle>
                <CardDescription>
                  Envoie des SMS à tes clients qui ont laissé leurs coordonnées
                  via le jeu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/dashboard/sms">Configurer SMS</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
