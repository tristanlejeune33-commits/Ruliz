import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanBadge, type Plan } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Restaurants · Admin Ruliz",
};

export default async function AdminRestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, prenom: true, nom: true, email: true } },
      qrcodes: { select: { scanTotal: true, scanMois: true } },
      _count: { select: { categories: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="secondary">
          <Building2 className="size-3" />
          {restaurants.length} restaurant{restaurants.length > 1 ? "s" : ""}
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Restaurants</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Vue globale, tous clients confondus.
        </p>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Restaurant</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Catégories</TableHead>
            <TableHead className="text-right">Scans 30j</TableHead>
            <TableHead className="text-right">Scans total</TableHead>
            <TableHead>Créé</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-sm text-[var(--text-muted)]">
                Aucun restaurant.
              </TableCell>
            </TableRow>
          )}
          {restaurants.map((r) => {
            const totalScans = r.qrcodes.reduce((acc, q) => acc + Number(q.scanTotal), 0);
            const monthScans = r.qrcodes.reduce((acc, q) => acc + Number(q.scanMois), 0);
            return (
              <TableRow key={r.id.toString()}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.nom}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {r.ville ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/clients/${r.user.id}`}
                    className="flex flex-col text-sm hover:text-[var(--accent)]"
                  >
                    <span>
                      {r.user.prenom} {r.user.nom}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {r.user.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <PlanBadge plan={r.plan as Plan} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r._count.categories}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {monthScans.toLocaleString("fr-FR")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {totalScans.toLocaleString("fr-FR")}
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)]">
                  {format(r.createdAt, "d MMM yyyy", { locale: fr })}
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="icon" aria-label="Voir la carte publique">
                    <Link href={`/carte/${r.id.toString()}`} target="_blank">
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
