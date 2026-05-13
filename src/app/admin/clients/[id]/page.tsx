import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  History,
  Monitor,
  Receipt,
  ScrollText,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
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
import { PlanBadge, StatusBadge, type Plan, type Statut } from "@/components/shared/status-badge";
import { getClientById } from "@/server/admin/queries";
import {
  listClientBoutiqueCommandesAdmin,
  listClientSmsPurchasesAdmin,
  listClientStripeInvoicesAdmin,
} from "@/server/admin/client-billing-queries";
import { serialize } from "@/lib/serialize";
import { ClientForm } from "./client-form";
import { ClientActions } from "./client-actions";
import { ClientPermissions } from "./client-permissions";
import { ClientBillingTab } from "./client-billing-tab";
import { ImpersonateButton } from "./impersonate-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Client #${id} Admin Ruliz` };
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const client = await getClientById(numericId);
  if (!client) notFound();

  const data = serialize(client);

  // === Fetch BC + Factures + SMS purchases pour le tab "BC / Factures" ===
  // En parallèle pour limiter la latence (3 round-trips Stripe possibles)
  const [boutiqueCommandes, smsPurchases, stripeInvoices] = await Promise.all([
    listClientBoutiqueCommandesAdmin(numericId),
    listClientSmsPurchasesAdmin(numericId),
    listClientStripeInvoicesAdmin(numericId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/clients">
            <ArrowLeft className="size-3.5" />
            Tous les clients
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {data.prenom} {data.nom}
            </h1>
            <StatusBadge statut={data.statut as Statut} />
            {data.demoActive && (
              <Badge>
                <Sparkles className="size-3" /> Démo active
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {data.email} Inscrit{" "}
            {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true, locale: fr })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImpersonateButton
            targetUserId={String(data.id)}
            targetName={
              [data.prenom, data.nom].filter(Boolean).join(" ") || data.email
            }
          />
          <ClientActions
            id={data.id}
            email={data.email}
            statut={data.statut as Statut}
            demoActive={data.demoActive}
          />
        </div>
      </header>

      <Tabs defaultValue="compte" className="w-full">
        <TabsList>
          <TabsTrigger value="compte">
            <UserIcon className="size-3.5" /> Compte
          </TabsTrigger>
          <TabsTrigger value="droits">
            <ShieldCheck className="size-3.5" /> Droits & Plans
          </TabsTrigger>
          <TabsTrigger value="restaurants">
            <Building2 className="size-3.5" /> Restaurants ({data.restaurants.length})
          </TabsTrigger>
          <TabsTrigger value="jeux">
            <Sparkles className="size-3.5" /> Jeux
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Receipt className="size-3.5" /> BC / Factures (
            {boutiqueCommandes.length +
              smsPurchases.length +
              stripeInvoices.length}
            )
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="size-3.5" /> Logs ({data.logs.length})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Monitor className="size-3.5" /> Connexions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compte">
          <ClientForm
            client={{
              id: data.id,
              prenom: data.prenom ?? "",
              nom: data.nom ?? "",
              telephone: data.telephone ?? "",
              adresse: data.adresse ?? "",
              codePostal: data.codePostal ?? "",
              ville: data.ville ?? "",
              pays: data.pays ?? "France",
            }}
          />
        </TabsContent>

        <TabsContent value="droits">
          <ClientPermissions
            userId={data.id}
            userEmail={data.email}
            userRole={data.role ?? "client"}
            restaurants={data.restaurants.map((r) => {
              // Cast pour accéder aux nouveaux champs planOffert* avant que
              // le client Prisma soit régénéré localement.
              // ⚠️ Selon que la colonne est connue par Prisma OU lue via raw
              //    SQL, la valeur peut arriver en Date OU en string ISO. On
              //    normalise avec new Date(...) pour gérer les 2 cas.
              const ext = r as unknown as {
                planOffertExpiresAt?: Date | string | null;
                stripeCurrentPeriodEnd?: Date | string | null;
                stripeSubscriptionStatus?: string | null;
              };
              const toIso = (v: Date | string | null | undefined) => {
                if (!v) return null;
                const d = v instanceof Date ? v : new Date(v);
                return Number.isNaN(d.getTime()) ? null : d.toISOString();
              };
              return {
                id: r.id.toString(),
                nom: r.nom,
                plan: r.plan,
                ville: r.ville,
                planOffertExpiresAt: toIso(ext.planOffertExpiresAt),
                stripeCurrentPeriodEnd: toIso(ext.stripeCurrentPeriodEnd),
                stripeSubscriptionStatus:
                  ext.stripeSubscriptionStatus ?? null,
              };
            })}
          />
        </TabsContent>

        <TabsContent value="restaurants">
          <div className="grid gap-4 md:grid-cols-2">
            {data.restaurants.length === 0 && (
              <Card className="md:col-span-2 p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  Ce client n&apos;a pas encore de restaurant.
                </p>
              </Card>
            )}
            {data.restaurants.map((r) => {
              const totalScans = r.qrcodes.reduce((acc, q) => acc + Number(q.scanTotal), 0);
              // Calcule la durée restante : max(stripeEnd, offerEnd) null si rien d'actif
              const rExt = r as unknown as {
                planOffertExpiresAt?: string | Date | null;
                stripeCurrentPeriodEnd?: string | Date | null;
                stripeSubscriptionStatus?: string | null;
              };
              const stripeEnd = rExt.stripeCurrentPeriodEnd
                ? new Date(rExt.stripeCurrentPeriodEnd)
                : null;
              const offerEnd = rExt.planOffertExpiresAt
                ? new Date(rExt.planOffertExpiresAt)
                : null;
              const now = new Date();
              const validEnds: Date[] = [];
              if (offerEnd && offerEnd > now) validEnds.push(offerEnd);
              if (
                stripeEnd &&
                stripeEnd > now &&
                rExt.stripeSubscriptionStatus &&
                ["active", "trialing", "past_due"].includes(
                  rExt.stripeSubscriptionStatus,
                )
              ) {
                validEnds.push(stripeEnd);
              }
              const endsAt =
                validEnds.length > 0
                  ? new Date(Math.max(...validEnds.map((d) => d.getTime())))
                  : null;
              const daysLeft = endsAt
                ? Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)
                : null;
              return (
                <Card key={r.id}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle>{r.nom}</CardTitle>
                      <CardDescription>
                        {r.ville ?? " "} {r._count.categories} catégorie
                        {r._count.categories > 1 ? "s" : ""}
                        {daysLeft !== null && daysLeft > 0 && (
                          <>
                            {" "}
                            <span
                              className={
                                daysLeft <= 7
                                  ? "text-[var(--neon-danger)]"
                                  : daysLeft <= 30
                                    ? "text-[var(--neon-violet)]"
                                    : "text-[var(--neon-success)]"
                              }
                            >
                              ⏳ {daysLeft}j restant{daysLeft > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <PlanBadge plan={r.plan as Plan} />
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <Stat label="QR codes" value={r.qrcodes.length} />
                    <Stat label="Scans total" value={totalScans} />
                    <Stat label="Jeux" value={r.jeux.length} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="jeux">
          <Card>
            <CardHeader>
              <CardTitle>Jeux roulette</CardTitle>
              <CardDescription>
                Tous les jeux configurés par les restaurants de ce client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.restaurants.flatMap((r) => r.jeux).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Aucun jeu configuré.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.restaurants.flatMap((r) =>
                    r.jeux.map((j) => (
                      <li
                        key={j.id}
                        className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{j.nom ?? "Sans nom"}</p>
                          <p className="text-xs text-[var(--text-muted)]">{r.nom}</p>
                        </div>
                        <Badge variant={j.actif ? "success" : "secondary"}>
                          {j.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </li>
                    )),
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-[var(--accent)]" />
                BC / Factures du client
              </CardTitle>
              <CardDescription>
                Tous les bons de commande boutique, achats de packs SMS et
                factures d&apos;abonnement de ce client. Tu peux changer le
                statut d&apos;un BC directement depuis cette page : clic sur le
                statut → choisis le nouveau → enregistré instantanément.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientBillingTab
                commandes={boutiqueCommandes}
                smsPurchases={smsPurchases}
                invoices={stripeInvoices}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>50 derniers événements</CardTitle>
              <CardDescription>Audit trail complet pour ce compte.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.logs.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Aucun log enregistré.</p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {data.logs.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 py-2.5">
                      <History className="mt-0.5 size-3.5 text-[var(--text-muted)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {l.action ?? " "}
                        </p>
                        {l.details !== null && (
                          <pre className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">
                            {JSON.stringify(l.details)}
                          </pre>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        {format(new Date(l.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Sessions récentes</CardTitle>
              <CardDescription>
                IPs et user agents des connexions actuelles + récentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data.authUser?.sessions.length ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Aucune session active.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {data.authUser.sessions.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 py-3">
                      <Monitor className="mt-0.5 size-3.5 text-[var(--text-muted)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          IP{" "}
                          <span className="font-mono">{s.ipAddress ?? "?"}</span>
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {s.userAgent ?? " "}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <p>
                          {formatDistanceToNow(new Date(s.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                        <p>
                          Expire{" "}
                          {format(new Date(s.expiresAt), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}
