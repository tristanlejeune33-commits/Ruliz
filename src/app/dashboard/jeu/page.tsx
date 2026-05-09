import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Sparkles, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanLock } from "@/components/shared/plan-lock";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { JeuForm } from "./jeu-form";

export const metadata: Metadata = {
  title: "Roulette d'avis · Ruliz",
};

interface JeuConfig {
  cta?: string;
  lots: Array<{ label: string; probabilite: number }>;
  require_google_review?: boolean;
}

export default async function JeuPage() {
  const { restaurant } = await getCurrentRestaurant();

  const jeu = await prisma.jeu.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participations: true } },
      participations: {
        orderBy: { participatedAt: "desc" },
        take: 10,
      },
    },
  });

  const config = (jeu?.configJson as unknown as JeuConfig | null) ?? null;

  return (
    <div className="space-y-8">
      <header>
        <Badge variant="secondary">
          <Sparkles className="size-3" /> Roulette d&apos;avis
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Jeu roulette Google Reviews
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Tes clients laissent un avis Google et tentent de gagner un lot.
          Ça booste ton ranking local et capte leurs coordonnées.
        </p>
      </header>

      <PlanLock
        currentPlan={restaurant.plan}
        requiredPlan="pro"
        title="Le jeu roulette est inclus dans le plan Pro"
        description="Capte les coordonnées de tes clients pendant qu'ils laissent un avis 5 étoiles. Boostez votre ranking local en quelques scans."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <JeuForm
              restaurantId={restaurant.id.toString()}
              jeu={
                jeu
                  ? {
                      id: jeu.id.toString(),
                      nom: jeu.nom ?? "Roulette des avis",
                      actif: jeu.actif,
                      cta: config?.cta ?? "",
                      lots: config?.lots ?? [],
                      requireGoogleReview: config?.require_google_review ?? true,
                    }
                  : null
              }
            />
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <CardDescription>Total participants</CardDescription>
                <Users className="size-4 text-[var(--text-muted)]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <CardTitle className="text-3xl tabular-nums">
                  {jeu?._count.participations ?? 0}
                </CardTitle>
                {jeu && jeu._count.participations > 0 && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/dashboard/jeu/participations">
                      Voir tous les participants
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {jeu && jeu.participations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Derniers gagnants</CardTitle>
                  <CardDescription>10 plus récents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {serialize(jeu.participations).map((p) => {
                      const fullName =
                        [p.prenom, p.nom].filter(Boolean).join(" ") ||
                        p.email ||
                        "Anonyme";
                      return (
                        <li key={p.id} className="flex items-center gap-2 py-2">
                          <Star className="size-3 text-[var(--accent)]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {fullName}
                            </p>
                            <p className="truncate text-xs text-[var(--text-muted)]">
                              {p.lotGagne ?? "—"}
                              {p.actionSociale && (
                                <span className="ml-1 opacity-70">
                                  · via {p.actionSociale.replace("_", " ")}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--text-muted)]">
                            {format(new Date(p.participatedAt), "d MMM HH:mm", {
                              locale: fr,
                            })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </PlanLock>
    </div>
  );
}
