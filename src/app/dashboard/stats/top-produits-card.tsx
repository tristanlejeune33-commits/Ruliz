import { MousePointerClick, Sparkles, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TopProduitsCardProps {
  restaurantId: bigint;
  /** Combien de produits afficher (top N). Default 10. */
  limit?: number;
}

/**
 * Card "Produits les plus consultés" pour la page stats.
 * Affiche le top N des produits triés par clicCount desc.
 *
 * Donne au restaurateur une vue rapide de :
 *  - Ce qui attire l'attention (top 3 = à mettre en avant)
 *  - Ce qui passe inaperçu (queue de classement = à supprimer ou modifier)
 *
 * Server Component · lit Prisma directement, pas de fetch côté client.
 */
export async function TopProduitsCard({
  restaurantId,
  limit = 10,
}: TopProduitsCardProps) {
  const topProduits = await prisma.produit.findMany({
    where: { categorie: { restaurantId } },
    orderBy: [{ clicCount: "desc" }, { titre: "asc" }],
    take: limit,
    select: {
      id: true,
      titre: true,
      clicCount: true,
      prix: true,
      devise: true,
      estNouveau: true,
      categorie: { select: { titre: true } },
    },
  });

  const totalClicks = topProduits.reduce((acc, p) => acc + p.clicCount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointerClick className="size-4" />
              Produits les plus consultés
            </CardTitle>
            <CardDescription>
              Triés par nombre de clics depuis le lancement.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono">
            {totalClicks.toLocaleString("fr-FR")} clics
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {topProduits.length === 0 || totalClicks === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="size-6 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              Pas encore de clics. Dès que tes premiers clients exploreront ta
              carte, leurs interactions apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {topProduits.map((p, i) => {
              const pct =
                totalClicks > 0 ? (p.clicCount / totalClicks) * 100 : 0;
              return (
                <li
                  key={p.id.toString()}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] font-mono text-xs font-semibold text-[var(--text-muted)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{p.titre}</p>
                      {p.estNouveau && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {p.categorie.titre}
                      {p.prix !== null && (
                        <>
                          {" · "}
                          {Number(p.prix).toFixed(2).replace(".", ",")}{" "}
                          {p.devise || "€"}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {p.clicCount.toLocaleString("fr-FR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full bg-[var(--accent)] transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      {i === 0 && pct > 10 && (
                        <TrendingUp className="size-3 text-[var(--accent)]" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
