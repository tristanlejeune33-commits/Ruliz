"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  ImageOff,
  Inbox,
  Loader2,
  Package,
  PackageCheck,
  Receipt,
  Search,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateBoutiqueCommandeStatut } from "@/server/admin/boutique/actions";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AdminStripeInvoice } from "@/server/admin/factures-queries";

const INVOICE_STATUS_TONE: Record<string, { label: string; classes: string }> =
  {
    paid: {
      label: "Payée",
      classes:
        "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
    },
    open: {
      label: "Ouverte",
      classes:
        "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
    },
    void: {
      label: "Annulée",
      classes:
        "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
    },
    uncollectible: {
      label: "Impayée",
      classes:
        "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
    },
    draft: {
      label: "Brouillon",
      classes:
        "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
    },
  };

// 4 statuts BC avec couleurs distinctes + icônes — éditable inline.
type StatutKey =
  | "en_attente"
  | "en_preparation"
  | "expediee"
  | "livree"
  | "annulee";

const STATUT_CONFIG: Record<
  StatutKey,
  {
    label: string;
    icon: typeof Inbox;
    color: string;
    bg: string;
    border: string;
    text: string;
  }
> = {
  en_attente: {
    label: "Bon de commande reçu",
    icon: Inbox,
    color: "var(--neon-cyan)",
    bg: "var(--neon-cyan-soft)",
    border: "var(--neon-cyan)",
    text: "var(--neon-cyan)",
  },
  en_preparation: {
    label: "En cours de traitement",
    icon: Package,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.4)",
    text: "#b45309",
  },
  expediee: {
    label: "Expédiée",
    icon: Truck,
    color: "var(--neon-violet)",
    bg: "var(--neon-violet-soft)",
    border: "var(--neon-violet)",
    text: "var(--neon-violet)",
  },
  livree: {
    label: "Reçue",
    icon: PackageCheck,
    color: "var(--neon-success)",
    bg: "var(--neon-success-soft)",
    border: "var(--neon-success)",
    text: "var(--neon-success)",
  },
  annulee: {
    label: "Annulée",
    icon: XCircle,
    color: "var(--neon-danger)",
    bg: "var(--neon-danger-soft)",
    border: "var(--neon-danger)",
    text: "var(--neon-danger)",
  },
};

const STATUT_KEYS: StatutKey[] = [
  "en_attente",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
];

// Compat : alias pour le tag CSV/export
const BC_STATUT_TONE: Record<string, { label: string; classes: string }> = {};
for (const key of STATUT_KEYS) {
  const c = STATUT_CONFIG[key];
  BC_STATUT_TONE[key] = {
    label: c.label,
    classes: `border-[${c.border}]/30 bg-[${c.bg}] text-[${c.text}]`,
  };
}

interface SerializedCommande {
  id: string;
  totalCentimes: number;
  devise: string;
  statut: string;
  createdAt: string;
  livraisonNom: string | null;
  livraisonVille: string | null;
  livraisonCodePostal: string | null;
  items: Array<{
    id: string;
    produitNom: string;
    quantite: number;
    produit: { imageUrl: string | null };
  }>;
  user: {
    id: number;
    email: string;
    prenom: string | null;
    nom: string | null;
  };
  restaurant: { id: string; nom: string } | null;
}

interface FacturesAdminViewProps {
  invoices: AdminStripeInvoice[];
  commandes: SerializedCommande[];
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadInvoicesCsv(invoices: AdminStripeInvoice[]) {
  const headers = [
    "ID",
    "Numéro",
    "Date",
    "Statut",
    "Client",
    "Email",
    "Description",
    "Montant payé",
    "Montant dû",
    "Devise",
    "Période début",
    "Période fin",
  ];
  const rows = invoices.map((i) =>
    [
      i.id,
      i.number ?? "",
      i.createdAt ? format(new Date(i.createdAt), "yyyy-MM-dd HH:mm") : "",
      INVOICE_STATUS_TONE[i.status]?.label ?? i.status,
      i.user?.fullName ?? "",
      i.user?.email ?? "",
      i.description,
      (i.amountPaidCentimes / 100).toFixed(2),
      (i.amountDueCentimes / 100).toFixed(2),
      i.currency,
      i.periodStart ? format(new Date(i.periodStart), "yyyy-MM-dd") : "",
      i.periodEnd ? format(new Date(i.periodEnd), "yyyy-MM-dd") : "",
    ]
      .map(escapeCsv)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ruliz-factures-stripe-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCommandesCsv(commandes: SerializedCommande[]) {
  const headers = [
    "ID",
    "Date",
    "Statut",
    "Client",
    "Email",
    "Produits",
    "Total",
    "Devise",
    "Ville livraison",
    "Restaurant",
  ];
  const rows = commandes.map((c) => {
    const fullName =
      [c.user.prenom, c.user.nom].filter(Boolean).join(" ") || c.user.email;
    const produits = c.items
      .map((i) => `${i.produitNom} x${i.quantite}`)
      .join(" | ");
    return [
      c.id,
      format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
      BC_STATUT_TONE[c.statut]?.label ?? c.statut,
      fullName,
      c.user.email,
      produits,
      (c.totalCentimes / 100).toFixed(2),
      c.devise,
      c.livraisonVille ?? "",
      c.restaurant?.nom ?? "",
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
  a.download = `ruliz-bons-commande-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FacturesAdminView({
  invoices,
  commandes,
}: FacturesAdminViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  // ---- Factures filtrées ----
  const filteredInvoices = useMemo(() => {
    let out = invoices;
    if (statusFilter !== "all") {
      out = out.filter((i) => i.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          (i.user?.email?.toLowerCase().includes(q) ?? false) ||
          (i.user?.fullName?.toLowerCase().includes(q) ?? false) ||
          (i.number?.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [invoices, statusFilter, query]);

  return (
    <Tabs defaultValue="commandes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="commandes">
          <ShoppingBag className="size-3.5" strokeWidth={1.75} />
          BC en cours
          <span className="ml-1 rounded-md bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold tabular-nums">
            {commandes.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <CreditCard className="size-3.5" strokeWidth={1.75} />
          Factures Stripe
          <span className="ml-1 rounded-md bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold tabular-nums">
            {invoices.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* ============== FACTURES STRIPE ============== */}
      <TabsContent value="invoices" className="space-y-3">
        {/* Toolbar : filtres + export */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-2 pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
                <SelectItem value="open">Ouvertes</SelectItem>
                <SelectItem value="uncollectible">Impayées</SelectItem>
                <SelectItem value="void">Annulées</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email, nom ou numéro de facture…"
                className="h-8 w-[260px] rounded-lg border border-[var(--border-glass)] bg-transparent pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--neon-cyan)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]/30"
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

            <span className="text-xs text-[var(--text-tertiary)]">
              {filteredInvoices.length} sur {invoices.length}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadInvoicesCsv(filteredInvoices)}
            disabled={filteredInvoices.length === 0}
          >
            <Download className="size-3.5" strokeWidth={1.75} />
            Export CSV
          </Button>
        </div>

        {filteredInvoices.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <Receipt
              className="size-10 text-[var(--text-tertiary)]"
              strokeWidth={1.5}
            />
            <p className="text-sm text-[var(--text-secondary)]">
              {invoices.length === 0
                ? "Aucune facture Stripe — vérifie ta config STRIPE_SECRET_KEY."
                : "Aucune facture ne matche les filtres."}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden md:table-cell">Période</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const tone = INVOICE_STATUS_TONE[inv.status] ?? {
                    label: inv.status,
                    classes:
                      "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                  };
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        {inv.number ?? `INV-${inv.id.slice(-8)}`}
                      </TableCell>
                      <TableCell>
                        {inv.user ? (
                          <Link
                            href={`/admin/clients/${inv.user.id}`}
                            className="hover:text-[var(--neon-cyan)]"
                          >
                            <div className="font-medium text-[var(--text-primary)]">
                              {inv.user.fullName}
                            </div>
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              {inv.user.email}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            — (customer Stripe inconnu)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-[var(--text-tertiary)]">
                        {inv.periodStart && inv.periodEnd
                          ? `${format(new Date(inv.periodStart), "d MMM", {
                              locale: fr,
                            })} – ${format(new Date(inv.periodEnd), "d MMM yyyy", {
                              locale: fr,
                            })}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {(inv.amountPaidCentimes / 100).toLocaleString(
                          "fr-FR",
                          { style: "currency", currency: inv.currency },
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            tone.classes,
                          )}
                        >
                          {tone.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-[var(--text-tertiary)]">
                        {inv.createdAt &&
                          format(new Date(inv.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {inv.invoicePdfUrl && (
                            <Button
                              asChild
                              variant="outline"
                              size="icon-sm"
                              title="Télécharger PDF"
                            >
                              <a
                                href={inv.invoicePdfUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download
                                  className="size-3.5"
                                  strokeWidth={1.75}
                                />
                              </a>
                            </Button>
                          )}
                          {inv.hostedInvoiceUrl && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              title="Voir en ligne"
                            >
                              <a
                                href={inv.hostedInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink
                                  className="size-3.5"
                                  strokeWidth={1.75}
                                />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>

      {/* ============== BONS DE COMMANDE EN COURS ============== */}
      <TabsContent value="commandes" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-2 pl-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">
              {commandes.length} bon{commandes.length > 1 ? "s" : ""} de
              commande non livré{commandes.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCommandesCsv(commandes)}
              disabled={commandes.length === 0}
            >
              <Download className="size-3.5" strokeWidth={1.75} />
              Export CSV
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/boutique/commandes">
                Toutes les commandes
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>

        {commandes.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <CheckCircle2
              className="size-10 text-[var(--neon-success)]"
              strokeWidth={1.5}
            />
            <p className="text-sm text-[var(--text-secondary)]">
              Aucun bon de commande en cours — toutes les commandes sont livrées
              ou annulées.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Livraison
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commandes.map((c) => {
                  const fullName =
                    [c.user.prenom, c.user.nom].filter(Boolean).join(" ") ||
                    c.user.email;
                  const totalQty = c.items.reduce(
                    (s, i) => s + i.quantite,
                    0,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        BC-{c.id}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {c.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--bg-glass-strong)]">
                                {item.produit.imageUrl ? (
                                  <Image
                                    src={item.produit.imageUrl}
                                    alt=""
                                    width={24}
                                    height={24}
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
                              <span className="text-xs text-[var(--text-primary)]">
                                {item.produitNom}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                ×{item.quantite}
                              </span>
                            </div>
                          ))}
                          {c.items.length > 3 && (
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              +{c.items.length - 3} autres
                            </p>
                          )}
                          {totalQty > 1 && (
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              Total : {totalQty} unités
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/clients/${c.user.id}`}
                          className="hover:text-[var(--neon-cyan)]"
                        >
                          <div className="font-medium text-[var(--text-primary)]">
                            {fullName}
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">
                            {c.user.email}
                          </div>
                          {c.restaurant && (
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              {c.restaurant.nom}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-[var(--text-tertiary)]">
                        {c.livraisonVille
                          ? `${c.livraisonCodePostal ?? ""} ${c.livraisonVille}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: c.devise,
                        })}
                      </TableCell>
                      <TableCell>
                        <StatutDropdown commandeId={c.id} currentStatut={c.statut} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-[var(--text-tertiary)]">
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
      </TabsContent>
    </Tabs>
  );
}

/**
 * Dropdown éditable pour changer le statut d'un BC depuis la table admin.
 * Au clic → toast + router.refresh.
 */
function StatutDropdown({
  commandeId,
  currentStatut,
}: {
  commandeId: string;
  currentStatut: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const key: StatutKey = STATUT_KEYS.includes(currentStatut as StatutKey)
    ? (currentStatut as StatutKey)
    : "en_attente";
  const config = STATUT_CONFIG[key];

  const handleChange = (newKey: StatutKey) => {
    if (newKey === key) return;
    startTransition(async () => {
      const res = await updateBoutiqueCommandeStatut({
        id: commandeId,
        statut: newKey,
      });
      if (res.ok) {
        toast.success(`Statut changé : ${STATUT_CONFIG[newKey].label}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Select
      value={key}
      onValueChange={(v) => handleChange(v as StatutKey)}
      disabled={pending}
    >
      <SelectTrigger
        className="h-9 w-[210px] gap-1.5 whitespace-nowrap border-2 text-xs [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:truncate"
        style={{
          borderColor: config.border,
          backgroundColor: config.bg,
          color: config.text,
        }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUT_KEYS.map((k) => {
          const c = STATUT_CONFIG[k];
          const KIcon = c.icon;
          return (
            <SelectItem key={k} value={k}>
              <span className="inline-flex items-center gap-1.5">
                {pending && k === key ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <KIcon
                    className="size-3.5 shrink-0"
                    style={{ color: c.color }}
                  />
                )}
                {c.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
