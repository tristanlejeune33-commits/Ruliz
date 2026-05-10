"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, ImageOff, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { updateBoutiqueCommande } from "@/server/admin/boutique/actions";

type Statut =
  | "en_attente"
  | "en_preparation"
  | "expediee"
  | "livree"
  | "annulee";

interface SerializedCommande {
  id: string;
  userId: number;
  restaurantId: string | null;
  totalCentimes: number;
  devise: string;
  livraisonNom: string | null;
  livraisonAdresse: string | null;
  livraisonVille: string | null;
  livraisonCodePostal: string | null;
  livraisonPays: string | null;
  livraisonTelephone: string | null;
  notesClient: string | null;
  notesAdmin: string | null;
  statut: Statut;
  paidAt: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    produitNom: string;
    quantite: number;
    totalCentimes: number;
    produit: {
      id: string;
      nom: string;
      slug: string;
      imageUrl: string | null;
    };
  }>;
  user: {
    id: number;
    email: string;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
  };
  restaurant: { id: string; nom: string } | null;
}

const STATUT_TONE: Record<Statut, { label: string; classes: string }> = {
  en_attente: {
    label: "En attente",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  },
  en_preparation: {
    label: "En préparation",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  expediee: {
    label: "Expédiée",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  livree: {
    label: "Livrée",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  annulee: {
    label: "Annulée",
    classes:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
  },
};

interface CommandesAdminViewProps {
  commandes: SerializedCommande[];
  currentStatut: Statut | "all";
  currentQuery: string;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(commandes: SerializedCommande[]) {
  const headers = [
    "ID",
    "Date",
    "Statut",
    "Client",
    "Email",
    "Téléphone",
    "Restaurant",
    "Produits",
    "Total HT",
    "Devise",
    "Adresse livraison",
    "CP",
    "Ville",
    "Pays",
    "Téléphone livraison",
    "Notes client",
    "Notes admin",
  ];
  const rows = commandes.map((c) => {
    const fullName =
      [c.user.prenom, c.user.nom].filter(Boolean).join(" ") || c.user.email;
    const produitsLine = c.items
      .map((i) => `${i.produitNom} x${i.quantite}`)
      .join(" | ");
    return [
      c.id,
      format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
      STATUT_TONE[c.statut].label,
      fullName,
      c.user.email,
      c.user.telephone ?? "",
      c.restaurant?.nom ?? "",
      produitsLine,
      (c.totalCentimes / 100).toFixed(2),
      c.devise,
      c.livraisonAdresse ?? "",
      c.livraisonCodePostal ?? "",
      c.livraisonVille ?? "",
      c.livraisonPays ?? "",
      c.livraisonTelephone ?? "",
      c.notesClient ?? "",
      c.notesAdmin ?? "",
    ]
      .map(escapeCsv)
      .join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ruliz-commandes-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CommandesAdminView({
  commandes,
  currentStatut,
  currentQuery,
}: CommandesAdminViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [queryInput, setQueryInput] = useState(currentQuery);

  // Sync the input quand l'URL change (back/forward)
  useEffect(() => {
    setQueryInput(currentQuery);
  }, [currentQuery]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleStatutChange = (commandeId: string, newStatut: Statut) => {
    setPendingId(commandeId);
    startTransition(async () => {
      const res = await updateBoutiqueCommande({
        id: commandeId,
        statut: newStatut,
      });
      setPendingId(null);
      if (res.ok) {
        toast.success("Statut mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar : filtres + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-2 pl-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select
            value={currentStatut}
            onValueChange={(v) => updateUrl({ statut: v })}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_preparation">En préparation</SelectItem>
              <SelectItem value="expediee">Expédiée</SelectItem>
              <SelectItem value="livree">Livrée</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>

          {/* Search by client */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateUrl({ q: queryInput });
            }}
            className="relative"
          >
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Email, prénom, nom du client…"
              className="h-8 w-[260px] rounded-lg border border-[var(--border-glass)] bg-transparent pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--neon-cyan)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]/30"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => {
                  setQueryInput("");
                  updateUrl({ q: null });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Effacer"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            )}
          </form>

          <span className="text-xs text-[var(--text-tertiary)]">
            {commandes.length} commande{commandes.length > 1 ? "s" : ""}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(commandes)}
          disabled={commandes.length === 0}
        >
          <Download className="size-3.5" strokeWidth={1.75} />
          Export CSV
        </Button>
      </div>

      {commandes.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Aucune commande ne matche les filtres.
          </p>
          {(currentStatut !== "all" || currentQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateUrl({ statut: null, q: null })}
            >
              Effacer les filtres
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden lg:table-cell">Livraison</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.map((c) => {
                const fullName =
                  [c.user.prenom, c.user.nom].filter(Boolean).join(" ") ||
                  c.user.email;
                const totalQty = c.items.reduce((s, i) => s + i.quantite, 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-[11px] text-[var(--text-tertiary)]">
                      #{c.id}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {c.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2"
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--bg-glass-strong)]">
                              {item.produit.imageUrl ? (
                                <Image
                                  src={item.produit.imageUrl}
                                  alt=""
                                  width={28}
                                  height={28}
                                  unoptimized
                                  className="size-full object-cover"
                                />
                              ) : (
                                <ImageOff
                                  className="size-3 text-[var(--text-tertiary)]"
                                  strokeWidth={1.75}
                                />
                              )}
                            </div>
                            <span className="text-sm text-[var(--text-primary)]">
                              {item.produitNom}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                              ×{item.quantite}
                            </span>
                          </div>
                        ))}
                        {totalQty > 1 && (
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            Total : {totalQty} unités
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)]">
                        {fullName}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {c.user.email}
                      </div>
                      {c.restaurant && (
                        <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                          {c.restaurant.nom}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {c.livraisonAdresse ? (
                        <>
                          <div>{c.livraisonNom}</div>
                          <div className="text-[var(--text-tertiary)]">
                            {c.livraisonAdresse}
                          </div>
                          <div className="text-[var(--text-tertiary)]">
                            {[
                              c.livraisonCodePostal,
                              c.livraisonVille,
                              c.livraisonPays,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: c.devise,
                      })}
                    </TableCell>
                    <TableCell>
                      {c.paidAt ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--neon-success)]"
                          title={
                            c.stripePaymentIntentId
                              ? `Stripe : ${c.stripePaymentIntentId}`
                              : undefined
                          }
                        >
                          ✓ Payée
                        </span>
                      ) : c.stripeCheckoutSessionId ? (
                        <span className="inline-flex items-center rounded-md border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--neon-violet)]">
                          En cours…
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-tertiary)]">
                          À facturer
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.statut}
                        onValueChange={(v) =>
                          handleStatutChange(c.id, v as Statut)
                        }
                        disabled={pendingId === c.id}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-[140px] text-xs font-medium",
                            STATUT_TONE[c.statut].classes,
                          )}
                        >
                          {pendingId === c.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_attente">En attente</SelectItem>
                          <SelectItem value="en_preparation">
                            En préparation
                          </SelectItem>
                          <SelectItem value="expediee">Expédiée</SelectItem>
                          <SelectItem value="livree">Livrée</SelectItem>
                          <SelectItem value="annulee">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-[var(--text-tertiary)]">
                      {format(new Date(c.createdAt), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
