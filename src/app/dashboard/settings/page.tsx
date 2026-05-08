import type { Metadata } from "next";
import { CreditCard, Plug, Settings as SettingsIcon, Users } from "lucide-react";
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Paramètres</h1>
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

        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Mon compte</CardTitle>
              <CardDescription>
                Coordonnées de connexion. Le changement d&apos;email sera disponible en
                Phase 6.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" value={session.user.name ?? "—"} />
              <Field label="Email" value={session.user.email} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <CardTitle>Équipe</CardTitle>
              <CardDescription>
                Invite tes collaborateurs à éditer la carte. Disponible en Phase 6.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled>Inviter un membre (bientôt)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Plan actuel</CardTitle>
                  <CardDescription>Géré par Stripe — disponible en Phase 5.</CardDescription>
                </div>
                <PlanBadge plan={restaurant.plan as Plan} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Le portail Stripe sera intégré en Phase 5 pour gérer ton abonnement, ta
                carte de paiement et tes factures.
              </p>
              <Button disabled>Ouvrir le portail Stripe (Phase 5)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Google Reviews</CardTitle>
                <CardDescription>
                  Lien Google utilisé par le jeu roulette. À configurer dans la fiche restaurant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href="/dashboard/restaurant">Configurer dans le restaurant</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anthropic Claude (traduction IA)</CardTitle>
                <CardDescription>
                  Géré côté plateforme. La carte est traduite en arrière-plan dans 7 langues.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  Aucune action requise. Disponible dès Phase 4.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMS marketing (à venir)</CardTitle>
                <CardDescription>
                  Envoie des SMS à tes clients qui ont laissé leurs coordonnées via le jeu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-muted)]">Phase 6.</p>
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
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
