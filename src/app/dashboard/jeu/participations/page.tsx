import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { listParticipations } from "@/server/dashboard/jeu-participations";

export const metadata: Metadata = {
  title: "Participants au jeu Ruliz",
};

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#E1306C" },
  google_review: { label: "Avis Google", color: "#fbbc04" },
};

export default async function ParticipationsPage() {
  const { restaurant } = await getCurrentRestaurant();

  // Récupère le dernier jeu actif (un seul restaurant a un seul jeu actif à la fois)
  const jeu = await prisma.jeu.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, nom: true },
  });

  if (!jeu) {
    return (
      <div className="space-y-8">
        <header>
          <Badge variant="secondary">
            <Sparkles className="size-3" /> Participants
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Aucun jeu configuré
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Crée d&apos;abord un jeu pour pouvoir voir les participants.
          </p>
        </header>
        <Button asChild variant="outline">
          <Link href="/dashboard/jeu">
            <ArrowLeft className="size-3.5" />
            Retour à la roulette
          </Link>
        </Button>
      </div>
    );
  }

  const participations = await listParticipations({
    jeuId: jeu.id,
    limit: 1000,
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">
            <Sparkles className="size-3" /> Jeu Participants
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {participations.length} participant
            {participations.length > 1 ? "s" : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Tous les leads captés par ta roulette &mdash; tu peux les exporter
            pour les contacter par email ou SMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/jeu">
              <ArrowLeft className="size-3.5" />
              Retour
            </Link>
          </Button>
          <Button asChild size="sm">
            <a
              href={`/api/dashboard/jeu/participations/export?jeuId=${jeu.id}`}
              download
            >
              <Download className="size-3.5" />
              Exporter en CSV
            </a>
          </Button>
        </div>
      </header>

      {participations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Sparkles className="size-8 text-[var(--text-muted)]" />
            <h3 className="text-lg font-medium">Aucune participation</h3>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Dès que tes premiers clients tourneront la roue depuis la carte
              publique, ils apparaîtront ici avec leurs coordonnées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Lot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {participations.map((p) => {
                  const action = p.actionSociale
                    ? ACTION_LABEL[p.actionSociale]
                    : null;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-elevated)]/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-muted)]">
                        {format(p.participatedAt, "d MMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="size-3.5 text-[var(--text-muted)]" />
                          <div>
                            <p className="font-medium">
                              {[p.prenom, p.nom].filter(Boolean).join(" ") ||
                                " "}
                            </p>
                            {p.naissance && (
                              <p className="text-xs text-[var(--text-muted)]">
                                Né(e) {p.naissance}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {p.email && (
                            <a
                              href={`mailto:${p.email}`}
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            >
                              <Mail className="size-3" />
                              {p.email}
                            </a>
                          )}
                          {p.telephone && (
                            <a
                              href={`tel:${p.telephone}`}
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            >
                              <Phone className="size-3" />
                              {p.telephone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {action && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${action.color}22`,
                              color: action.color,
                            }}
                          >
                            {action.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.lotGagne ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <Star className="size-3 text-[var(--accent)]" />
                            {p.lotGagne}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                             
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {participations.length === 1000 && (
            <p className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-muted)]">
              Affichage limité aux 1000 participations les plus récentes. Utilise
              l&apos;export CSV pour avoir la liste complète.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
