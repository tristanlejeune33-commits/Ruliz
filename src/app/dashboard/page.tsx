import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Eye, ScanLine, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getRestaurantStats } from "@/server/dashboard/stats";
import { ScansChart } from "./stats/scans-chart";

export const metadata: Metadata = {
  title: "Dashboard · Ruliz",
};

export default async function DashboardHome() {
  const { session, restaurant } = await getCurrentRestaurant();
  const stats = await getRestaurantStats(restaurant.id, "30d");

  const firstName = session.user.name?.split(" ")[0] ?? "👋";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">Bienvenue</Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Salut {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Voici ce qui se passe sur la carte de <strong>{restaurant.nom}</strong>.
          </p>
        </div>
        <Button asChild>
          <Link href={`/carte/${restaurant.id.toString()}`} target="_blank">
            Voir ma carte publique <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:col-span-2 md:row-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardDescription>Scans 30 derniers jours</CardDescription>
                <CardTitle className="mt-2 text-4xl tabular-nums">
                  {stats.scansThis.toLocaleString("fr-FR")}
                </CardTitle>
              </div>
              <ScanLine className="size-5 text-[var(--text-muted)]" />
            </div>
          </CardHeader>
          <CardContent>
            <ScansChart data={stats.perDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
            <CardDescription>Catégories</CardDescription>
            <Eye className="size-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">—</CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Édite ta carte pour ajouter des plats.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
            <CardDescription>Langues consultées</CardDescription>
            <Star className="size-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">
              {stats.langBreakdown.length}
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {stats.langBreakdown.map((l) => l.lang.toUpperCase()).join(" · ") || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Édite ta carte</CardTitle>
          <CardDescription>
            Drag & drop des catégories, modal d&apos;édition produit, preview live à droite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/menu">
              Ouvrir l&apos;éditeur <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
