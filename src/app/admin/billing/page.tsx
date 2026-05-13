import type { Metadata } from "next";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Euro,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import { prisma } from "@/lib/db";
import { PLANS, formatPriceEuro } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Facturation · Admin Ruliz",
};

/** Palette DS-strict : success / cyan / violet (warning) / danger / glass. */
const STATUS_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  active: {
    bg: "bg-[var(--neon-success-soft)]",
    text: "text-[var(--neon-success)]",
  },
  trialing: {
    bg: "bg-[var(--neon-cyan-soft)]",
    text: "text-[var(--neon-cyan)]",
  },
  past_due: {
    bg: "bg-[var(--neon-violet-soft)]",
    text: "text-[var(--neon-violet)]",
  },
  unpaid: {
    bg: "bg-[var(--neon-danger-soft)]",
    text: "text-[var(--neon-danger)]",
  },
  canceled: {
    bg: "bg-[var(--bg-glass)]",
    text: "text-[var(--text-tertiary)]",
  },
  incomplete: {
    bg: "bg-[var(--neon-violet-soft)]",
    text: "text-[var(--neon-violet)]",
  },
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "En retard",
  unpaid: "Impayé",
  canceled: "Annulé",
  incomplete: "Incomplet",
};

export default async function AdminBillingPage() {
  // Tous les restaurants avec leur info Stripe + propriétaire
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, prenom: true, nom: true, email: true } },
    },
  });

  // KPI globaux
  const totalRestaurants = restaurants.length;
  const activeSubs = restaurants.filter(
    (r) => r.stripeSubscriptionStatus === "active",
  ).length;
  const pastDue = restaurants.filter(
    (r) =>
      r.stripeSubscriptionStatus === "past_due" ||
      r.stripeSubscriptionStatus === "unpaid",
  ).length;
  const suspended = restaurants.filter((r) => r.statut === "suspendu").length;

  // MRR estimé : somme des prix mensuels des subs actives
  const mrr = restaurants.reduce((acc, r) => {
    if (
      r.stripeSubscriptionStatus !== "active" &&
      r.stripeSubscriptionStatus !== "trialing"
    )
      return acc;
    const planMeta = PLANS[r.plan];
    return acc + (planMeta?.monthlyPriceHT ?? 0);
  }, 0);

  // ARR projeté = MRR × 12
  const arr = mrr * 12;

  // CA réel total = somme des MRR multipliée par le nombre de mois actifs (estimation)
  // Pour avoir le vrai CA, faudrait interroger Stripe Reports.
  // En attendant : MRR × moyenne de jours actifs / 30
  const totalGenerated = restaurants.reduce((acc, r) => {
    const planMeta = PLANS[r.plan];
    if (!planMeta || planMeta.monthlyPriceHT === 0) return acc;
    if (!r.stripeCurrentPeriodEnd) return acc;
    // Estime les mois écoulés depuis la création de l'abonnement
    const daysActive = Math.max(
      0,
      differenceInDays(new Date(), r.createdAt),
    );
    const monthsActive = daysActive / 30;
    return acc + planMeta.monthlyPriceHT * monthsActive;
  }, 0);

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="secondary">
          <CreditCard className="size-3" /> Facturation Admin
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Vue financière
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Revenu mensuel récurrent, ARR, abonnements actifs, paiements en
          retard, CA généré.
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <CardDescription>Revenu mensuel récurrent</CardDescription>
            <TrendingUp className="size-4 text-[var(--neon-success)]" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {formatPriceEuro(mrr)}
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Somme des abonnements actifs sur 1 mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <CardDescription>ARR projeté</CardDescription>
            <Euro className="size-4 text-[var(--neon-success)]" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {formatPriceEuro(arr)}
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Revenu mensuel × 12
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <CardDescription>Subs actives</CardDescription>
            <CheckCircle2 className="size-4 text-[var(--neon-success)]" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">
              {activeSubs}
              <span className="ml-2 text-base font-normal text-[var(--text-muted)]">
                / {totalRestaurants}
              </span>
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {Math.round((activeSubs / Math.max(1, totalRestaurants)) * 100)}%
              taux d&apos;activation
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            pastDue > 0 || suspended > 0
              ? "border-[var(--neon-violet)]/40 bg-[var(--neon-violet-soft)]"
              : undefined
          }
        >
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <CardDescription>Problèmes paiement</CardDescription>
            <AlertTriangle
              className={`size-4 ${pastDue > 0 || suspended > 0 ? "text-[var(--neon-violet)]" : "text-[var(--text-muted)]"}`}
              strokeWidth={1.75}
            />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl tabular-nums">{pastDue + suspended}</CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {pastDue} en retard · {suspended} suspendus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CA généré · palette DS stricte (success soft + glow subtil) */}
      <Card className="relative overflow-hidden border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardDescription>CA généré (estimation)</CardDescription>
              <CardTitle className="mt-1 text-4xl tabular-nums">
                {formatPriceEuro(totalGenerated)}
              </CardTitle>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Estimation sur la base du revenu mensuel × ancienneté des
                comptes. Pour le CA réel facturé, consulte Stripe Dashboard
                → Rapports → Revenu.
              </p>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] underline hover:opacity-80"
            >
              Stripe Dashboard ↗
            </a>
          </div>
        </CardHeader>
      </Card>

      {/* Table de tous les abonnements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Tous les abonnements ({totalRestaurants})
          </CardTitle>
          <CardDescription>
            Triés par date de création (plus récents en haut).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut Stripe</TableHead>
                <TableHead>Statut resto</TableHead>
                <TableHead className="text-right">Revenu mensuel</TableHead>
                <TableHead>Renouvellement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => {
                const planMeta = PLANS[r.plan];
                const subStatus = r.stripeSubscriptionStatus;
                const subColor = subStatus
                  ? STATUS_COLORS[subStatus]
                  : null;
                const isSuspended = r.statut === "suspendu";
                return (
                  <TableRow key={r.id.toString()}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.nom}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {r.ville ?? "·"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>
                          {r.user.prenom} {r.user.nom}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {r.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={r.plan as Plan} />
                    </TableCell>
                    <TableCell>
                      {subStatus ? (
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${subColor?.bg ?? "bg-[var(--bg-elevated)]"} ${subColor?.text ?? "text-[var(--text-muted)]"}`}
                        >
                          {STATUS_LABELS[subStatus] ?? subStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">
                          ·
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--neon-danger)]">
                          <XCircle className="size-3" strokeWidth={1.75} />
                          Suspendu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--neon-success)]">
                          <CheckCircle2 className="size-3" strokeWidth={1.75} />
                          Actif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {planMeta?.monthlyPriceHT
                        ? formatPriceEuro(planMeta.monthlyPriceHT)
                        : "·"}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">
                      {r.stripeCurrentPeriodEnd
                        ? format(r.stripeCurrentPeriodEnd, "d MMM yyyy", {
                            locale: fr,
                          })
                        : "·"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
