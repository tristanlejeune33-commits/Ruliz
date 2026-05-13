"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit,
  ImageOff,
  Plus,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ProduitDrawer, type SerializedBoutiqueProduit } from "./produit-drawer";

interface BoutiqueAdminViewProps {
  produits: Array<
    SerializedBoutiqueProduit & {
      _count: { commandeItems: number };
    }
  >;
}

const STATUT_TONE: Record<
  SerializedBoutiqueProduit["statut"],
  { label: string; classes: string }
> = {
  publie: {
    label: "Publié",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  brouillon: {
    label: "Brouillon",
    classes:
      "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
  },
  archive: {
    label: "Archivé",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
};

export function BoutiqueAdminView({ produits }: BoutiqueAdminViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<
    SerializedBoutiqueProduit | "new" | null
  >(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produits;
    return produits.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.categorie ?? "").toLowerCase().includes(q),
    );
  }, [produits, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-2 pl-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="h-8 w-full rounded-lg border border-[var(--border-glass)] bg-transparent pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--neon-cyan)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Effacer"
            >
              <X className="size-3" strokeWidth={1.75} />
            </button>
          )}
        </div>
        <Button onClick={() => setEditing("new")} size="sm" variant="primary">
          <Plus className="size-3.5" strokeWidth={2} />
          Nouveau produit
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {query
              ? `Aucun produit ne matche « ${query} ».`
              : "Aucun produit dans la boutique. Crée-en un pour démarrer."}
          </p>
          {!query && (
            <Button onClick={() => setEditing("new")} size="sm">
              <Plus className="size-3.5" strokeWidth={2} />
              Créer mon premier produit
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  Stock
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const tone = STATUT_TONE[p.statut];
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-glass-hover)]"
                  >
                    <TableCell>
                      <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-glass-strong)]">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageOff
                            className="size-4 text-[var(--text-tertiary)]"
                            strokeWidth={1.75}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)]">
                        {p.nom}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        {p.slug}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-[var(--text-secondary)]">
                      {p.categorie ?? " "}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {(p.prixCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: p.devise,
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                          tone.classes,
                        )}
                      >
                        {tone.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      <StockBadge
                        stockMax={p.stockMax}
                        stockUtilise={p.stockUtilise ?? 0}
                        stockRestant={p.stockRestant}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(p);
                        }}
                        aria-label="Éditer"
                      >
                        <Edit className="size-3.5" strokeWidth={1.75} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {editing && (
        <ProduitDrawer
          produit={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Badge stock affiche stockUtilise / stockMax avec coloration palière :
 *   - null stockMax → "∞" gris (illimité)
 *   - rupture (restant === 0) → rouge
 *   - low stock (≤ 10) → violet warning
 *   - sinon → vert success
 */
function StockBadge({
  stockMax,
  stockUtilise,
  stockRestant,
}: {
  stockMax: number | null;
  stockUtilise: number;
  stockRestant: number | null | undefined;
}) {
  if (stockMax === null) {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-tertiary)]"
        title={`${stockUtilise} unité(s) commandée(s) stock illimité`}
      >
        <span className="text-base leading-none">∞</span>
        <span className="tabular-nums">  {stockUtilise}</span>
      </span>
    );
  }
  const remaining = stockRestant ?? Math.max(0, stockMax - stockUtilise);
  const tone =
    remaining === 0
      ? "text-[var(--neon-danger)]"
      : remaining <= 10
        ? "text-[var(--neon-violet)]"
        : "text-[var(--neon-success)]";
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-mono text-xs tabular-nums", tone)}
      title={`${stockUtilise} commandées ${remaining} restantes sur ${stockMax}`}
    >
      <span className="font-semibold">{remaining}</span>
      <span className="text-[var(--text-tertiary)]">/ {stockMax}</span>
    </span>
  );
}
