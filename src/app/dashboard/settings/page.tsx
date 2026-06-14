import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Receipt,
  Scale,
  Settings as SettingsIcon,
  ShieldCheck,
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
import { getEffectivePlan } from "@/lib/plan-gate";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { RestartTourButton } from "./restart-tour-button";
import { DeleteAccountCard } from "./delete-account-card";

export const metadata: Metadata = {
  title: "Paramètres Ruliz",
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
        </TabsList>

        <TabsContent value="profil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mon compte</CardTitle>
              <CardDescription>
                Coordonnées de connexion. Pour changer ton email, contacte
                le support à{" "}
                <a
                  href="mailto:tom.rullier@ruliz.fr"
                  className="underline hover:text-[var(--text-primary)]"
                >
                  tom.rullier@ruliz.fr
                </a>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" value={session.user.name ?? "Non renseigné"} />
              <Field label="Email" value={session.user.email} />
            </CardContent>
          </Card>

          {/* Didacticiel / Tour guidé relance la bulle d'onboarding */}
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
                    mettre ta carte en ligne. Utile si tu as zappé la 1ère
                    fois ou si tu veux le montrer à un collègue.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RestartTourButton />
            </CardContent>
          </Card>

          {/* === Informations légales ===
              Liens vers les pages publiques /legal/* toujours accessibles
              depuis le dropdown utilisateur en sidebar, mais on les remet
              ici en évidence pour que ce soit trouvable. Ouverture en
              nouvel onglet (rel="noopener" auto sur target=_blank). */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-violet-soft)] text-[var(--neon-violet)] ring-1 ring-[var(--neon-violet)]/30">
                  <Scale className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <CardTitle>Informations légales</CardTitle>
                  <CardDescription className="mt-1">
                    Mentions légales, CGV et politique de confidentialité de
                    Ruliz. Consulte-les à tout moment depuis ton espace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link
                  href="/legal/mentions-legales"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Scale className="size-3.5" strokeWidth={1.75} />
                  Mentions légales &amp; CGV
                  <ExternalLink className="size-3" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href="/legal/politique-confidentialite"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                  Politique de confidentialité
                  <ExternalLink className="size-3" strokeWidth={1.75} />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* === Zone dangereuse suppression de compte (RGPD) === */}
          <DeleteAccountCard userEmail={session.user.email} />
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
          {/* Plan actuel résumé + lien vers /dashboard/billing */}
          <Card className="lift-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Plan actuel</CardTitle>
                  <CardDescription>
                    Géré par Stripe. Résiliation et changement de plan à tout moment.
                  </CardDescription>
                </div>
                <PlanBadge plan={getEffectivePlan(restaurant) as Plan} />
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

          {/* BC / Factures bons de commande + factures d'abonnement */}
          <Card className="lift-hover">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30">
                    <Receipt className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <CardTitle>BC / Factures</CardTitle>
                    <CardDescription className="mt-1">
                      Suis tes bons de commande boutique en direct + télécharge
                      toutes tes factures (abonnement et achats de SMS).
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="primary">
                <Link href="/dashboard/settings/factures">
                  Voir mes BC / factures
                  <ArrowRight className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>
            </CardContent>
          </Card>
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
