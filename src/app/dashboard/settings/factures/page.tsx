import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { cn } from "@/lib/utils";
import { listMyBoutiqueCommandes } from "@/server/dashboard/boutique-queries";
import { listStripeInvoices } from "@/server/dashboard/factures-queries";

export const metadata: Metadata = {
  title: "Mes commandes & factures · Ruliz",
};

const STATUT_TONE: Record<string, { label: string; classes: string }> = {
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

const INVOICE_STATUS_TONE: Record<string, { label: string; classes: string }> = {
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

export default async function FacturesPage() {
  const [commandes, invoices] = await Promise.all([
    listMyBoutiqueCommandes(),
    listStripeInvoices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/settings">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Paramètres
          </Link>
        </Button>
      </div>

      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Receipt className="size-3" strokeWidth={1.75} />}>
            Comptabilité
          </HeroEyebrow>
        }
        title="Mes commandes & factures"
        description="Retrouve l'historique complet de tes commandes boutique et de tes factures d'abonnement Ruliz."
      />

      {/* === BONS DE COMMANDE BOUTIQUE === */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ShoppingBag
              className="size-4 text-[var(--neon-violet)]"
              strokeWidth={1.75}
            />
            Bons de commande boutique
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {commandes.length}
            </span>
          </h2>
          {commandes.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/boutique">Acheter à nouveau</Link>
            </Button>
          )}
        </div>

        {commandes.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <ShoppingBag
              className="size-8 text-[var(--text-tertiary)]"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Aucune commande pour l&apos;instant
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/dashboard/boutique">Voir la boutique</Link>
            </Button>
          </Card>
        ) : (
          <ul className="space-y-2">
            {commandes.map((c) => {
              const tone = STATUT_TONE[c.statut] ?? STATUT_TONE.en_attente;
              const firstItem = c.items[0];
              const totalQty = c.items.reduce((s, i) => s + i.quantite, 0);
              return (
                <Card key={c.id.toString()} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-glass-strong)]">
                      {firstItem?.produit.imageUrl ? (
                        <Image
                          src={firstItem.produit.imageUrl}
                          alt=""
                          width={48}
                          height={48}
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
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                          BC-{c.id.toString()}
                        </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {firstItem?.produitNom ?? "Commande"}
                          {c.items.length > 1 && (
                            <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">
                              + {c.items.length - 1} autre
                              {c.items.length - 1 > 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            tone?.classes,
                          )}
                        >
                          {tone?.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                        {totalQty} article{totalQty > 1 ? "s" : ""} ·{" "}
                        {format(new Date(c.createdAt), "d MMM yyyy", {
                          locale: fr,
                        })}
                        {c.restaurant && (
                          <>
                            <span className="mx-1.5">·</span>
                            {c.restaurant.nom}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
                        {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: c.devise,
                        })}
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/boutique/commandes/${c.id}`}>
                          <FileText
                            className="size-3.5"
                            strokeWidth={1.75}
                          />
                          Bon
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {/* === FACTURES STRIPE ABONNEMENT === */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <CreditCard
              className="size-4 text-[var(--neon-cyan)]"
              strokeWidth={1.75}
            />
            Factures abonnement
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {invoices.length}
            </span>
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/billing">Gérer mon plan</Link>
          </Button>
        </div>

        {invoices.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <CreditCard
              className="size-8 text-[var(--text-tertiary)]"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Aucune facture d&apos;abonnement
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Les factures apparaîtront automatiquement dès ton premier
              paiement Pro ou Premium.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/dashboard/billing">Voir les plans</Link>
            </Button>
          </Card>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => {
              const tone = INVOICE_STATUS_TONE[inv.status] ?? {
                label: "Ouverte",
                classes:
                  "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
              };
              const isPaid = inv.status === "paid";
              return (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-lg",
                        isPaid
                          ? "bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                          : "bg-[var(--bg-glass-strong)] text-[var(--text-tertiary)]",
                      )}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="size-5" strokeWidth={2} />
                      ) : (
                        <Receipt className="size-5" strokeWidth={1.75} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                          {inv.number ?? `INV-${inv.id.slice(-8)}`}
                        </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {inv.description}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            tone.classes,
                          )}
                        >
                          {tone.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                        {inv.createdAt &&
                          format(new Date(inv.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
                        {inv.periodStart && inv.periodEnd && (
                          <>
                            <span className="mx-1.5">·</span>
                            Période :{" "}
                            {format(new Date(inv.periodStart), "d MMM", {
                              locale: fr,
                            })}{" "}
                            –{" "}
                            {format(new Date(inv.periodEnd), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
                        {(inv.amountPaidCentimes / 100).toLocaleString(
                          "fr-FR",
                          {
                            style: "currency",
                            currency: inv.currency,
                          },
                        )}
                      </p>
                      <div className="flex gap-1">
                        {inv.invoicePdfUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download
                                className="size-3.5"
                                strokeWidth={1.75}
                              />
                              PDF
                            </a>
                          </Button>
                        )}
                        {inv.hostedInvoiceUrl && (
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Voir la facture en ligne"
                            >
                              <ExternalLink
                                className="size-3.5"
                                strokeWidth={1.75}
                              />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
