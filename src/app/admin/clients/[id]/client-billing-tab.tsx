"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  ImageOff,
  Inbox,
  Loader2,
  Package,
  PackageCheck,
  Receipt,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { updateBoutiqueCommandeStatut } from "@/server/admin/boutique/actions";
import type {
  ClientBoutiqueCommande,
  ClientSmsPurchase,
  ClientStripeInvoice,
} from "@/server/admin/client-billing-queries";

// ============================================================
// 4 statuts boutique avec couleurs + icônes
// ============================================================

type StatutKey = "recue" | "en_preparation" | "expediee" | "livree" | "annulee";

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
  recue: {
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

function normalizeStatut(raw: string): StatutKey {
  if (raw === "en_attente") return "recue";
  if (raw === "recue") return "recue";
  if (raw === "en_preparation") return "en_preparation";
  if (raw === "expediee") return "expediee";
  if (raw === "livree") return "livree";
  if (raw === "annulee") return "annulee";
  return "recue";
}

// Mapping affichage → valeur DB (les statuts dans la DB restent les anciens
// pour rétrocompat : "en_attente" plutôt que "recue").
const DB_STATUS_FROM_KEY: Record<StatutKey, string> = {
  recue: "en_attente",
  en_preparation: "en_preparation",
  expediee: "expediee",
  livree: "livree",
  annulee: "annulee",
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

interface ClientBillingTabProps {
  commandes: ClientBoutiqueCommande[];
  smsPurchases: ClientSmsPurchase[];
  invoices: ClientStripeInvoice[];
}

export function ClientBillingTab({
  commandes,
  smsPurchases,
  invoices,
}: ClientBillingTabProps) {
  return (
    <div className="space-y-6">
      {/* === BC BOUTIQUE === */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <ShoppingBag className="size-3.5" />
            Bons de commande boutique
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold text-[var(--text-tertiary)]">
              {commandes.length}
            </span>
          </h3>
        </header>

        {commandes.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--text-muted)]">
            Aucun bon de commande pour ce client.
          </Card>
        ) : (
          <ul className="space-y-2">
            {commandes.map((c) => (
              <CommandeRow key={c.id} commande={c} />
            ))}
          </ul>
        )}
      </section>

      {/* === FACTURES ABONNEMENT STRIPE === (swap : avant SMS, après BC) */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <CreditCard className="size-3.5" />
            Factures abonnement
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold text-[var(--text-tertiary)]">
              {invoices.length}
            </span>
          </h3>
        </header>

        {invoices.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--text-muted)]">
            Aucune facture d&apos;abonnement.
          </Card>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      inv.status === "paid"
                        ? "bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                        : "bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                    )}
                  >
                    {inv.status === "paid" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Receipt className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                        {inv.number ?? `INV-${inv.id.slice(-8)}`}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {inv.description}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                      {inv.createdAt &&
                        format(new Date(inv.createdAt), "d MMM yyyy", {
                          locale: fr,
                        })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-mono text-sm font-bold tabular-nums">
                      {(inv.amountPaidCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: inv.currency,
                      })}
                    </p>
                    <div className="flex gap-0.5">
                      {inv.invoicePdfUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={inv.invoicePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="size-3" /> PDF
                          </a>
                        </Button>
                      )}
                      {inv.hostedInvoiceUrl && (
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {/* === ACHATS SMS === (placé en dernier après le swap) */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Coins className="size-3.5" />
            Achats SMS
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold text-[var(--text-tertiary)]">
              {smsPurchases.length}
            </span>
          </h3>
        </header>

        {smsPurchases.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--text-muted)]">
            Aucun achat de SMS pour ce client.
          </Card>
        ) : (
          <ul className="space-y-2">
            {smsPurchases.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      p.status === "paid"
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                    )}
                  >
                    <Coins className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                        {p.invoiceNumber ?? `SMS-${p.id.slice(-8)}`}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Pack {p.packSize.toLocaleString("fr-FR")} SMS
                      </span>
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0 text-[10px] font-medium",
                          p.status === "paid"
                            ? "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                            : "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                        )}
                      >
                        {p.status === "paid" ? "Payée" : p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                      {format(
                        new Date(p.paidAt ?? p.createdAt),
                        "d MMM yyyy à HH:mm",
                        { locale: fr },
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-mono text-sm font-bold tabular-nums">
                      {(p.pricePaidCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                    <div className="flex gap-0.5">
                      {p.invoicePdfUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={p.invoicePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="size-3" /> PDF
                          </a>
                        </Button>
                      )}
                      {p.invoiceUrl && (
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={p.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

// ============================================================
// COMMANDE ROW avec STATUT EDITABLE
// ============================================================

function CommandeRow({ commande }: { commande: ClientBoutiqueCommande }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const statut = normalizeStatut(commande.statut);
  const config = STATUT_CONFIG[statut];

  const handleStatutChange = (newKey: StatutKey) => {
    const dbValue = DB_STATUS_FROM_KEY[newKey] as
      | "en_attente"
      | "en_preparation"
      | "expediee"
      | "livree"
      | "annulee";
    startTransition(async () => {
      const res = await updateBoutiqueCommandeStatut({
        id: commande.id,
        statut: dbValue,
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
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-glass-strong)]">
          {commande.firstItemImage ? (
            <Image
              src={commande.firstItemImage}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <ImageOff className="size-4 text-[var(--text-tertiary)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              BC-{commande.id}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {commande.firstItemName ?? "Commande"}
              {commande.itemsCount > 1 && (
                <span className="ml-1 text-[11px] font-normal text-[var(--text-tertiary)]">
                  + {commande.itemsCount - 1} autre
                  {commande.itemsCount - 1 > 1 ? "s" : ""}
                </span>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {format(new Date(commande.createdAt), "d MMM yyyy à HH:mm", {
              locale: fr,
            })}
            {commande.restaurantNom && (
              <>
                <span className="mx-1">·</span>
                {commande.restaurantNom}
              </>
            )}
          </p>
        </div>

        {/* SELECT STATUT INLINE (admin-only) · SelectValue rend l'enfant
            de SelectItem (icône + label), donc pas de duplication d'icône
            dans le trigger. Le CSS [&>span] cible le SelectValue rendu. */}
        <div className="shrink-0">
          <Select
            value={statut}
            onValueChange={(v) => handleStatutChange(v as StatutKey)}
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
              {(Object.keys(STATUT_CONFIG) as StatutKey[]).map((key) => {
                const k = STATUT_CONFIG[key];
                const KIcon = k.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <span className="inline-flex items-center gap-1.5">
                      {pending && key === statut ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      ) : (
                        <KIcon
                          className="size-3.5 shrink-0"
                          style={{ color: k.color }}
                        />
                      )}
                      {k.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="font-mono text-sm font-bold tabular-nums">
            {(commande.totalCentimes / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: commande.devise,
            })}
          </p>
          {commande.invoicePdfUrl && (
            <Button asChild variant="outline" size="sm">
              <a
                href={commande.invoicePdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="size-3" /> PDF
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
