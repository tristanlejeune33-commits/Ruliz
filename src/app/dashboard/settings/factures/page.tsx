import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  Inbox,
  Package,
  PackageCheck,
  Receipt,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { cn } from "@/lib/utils";
import {
  listMyBoutiqueCommandes,
  type BoutiqueCommandeRow,
} from "@/server/dashboard/boutique-queries";
import {
  getBoutiqueInvoiceUrls,
  listMySmsPurchases,
  listStripeInvoices,
} from "@/server/dashboard/factures-queries";

export const metadata: Metadata = {
  title: "BC / Factures Ruliz",
};

// ============================================================
// 4 STATUTS BOUTIQUE + COULEURS DISTINCTES
// ============================================================
// L'utilisateur a demandé 4 stades clairs avec couleurs différentes :
//  1. Bon de commande reçu  → cyan   (juste payé, en file)
//  2. En cours de traitement → orange (workflow actif)
//  3. Expédiée               → violet (en transit)
//  4. Reçue                  → vert   (terminé)
// + Annulée → rouge (cas spécial, exclu du stepper)

type StatutKey = "recue" | "en_preparation" | "expediee" | "livree" | "annulee";

const STATUT_STEPS: Array<{
  key: Exclude<StatutKey, "annulee">;
  label: string;
  icon: typeof Inbox;
  color: string;
  softBg: string;
  border: string;
  text: string;
}> = [
  {
    key: "recue",
    label: "Bon de commande reçu",
    icon: Inbox,
    color: "var(--neon-cyan)",
    softBg: "var(--neon-cyan-soft)",
    border: "var(--neon-cyan)",
    text: "var(--neon-cyan)",
  },
  {
    key: "en_preparation",
    label: "En cours de traitement",
    icon: Package,
    color: "#f59e0b", // orange
    softBg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.4)",
    text: "#b45309",
  },
  {
    key: "expediee",
    label: "Expédiée",
    icon: Truck,
    color: "var(--neon-violet)",
    softBg: "var(--neon-violet-soft)",
    border: "var(--neon-violet)",
    text: "var(--neon-violet)",
  },
  {
    key: "livree",
    label: "Reçue",
    icon: PackageCheck,
    color: "var(--neon-success)",
    softBg: "var(--neon-success-soft)",
    border: "var(--neon-success)",
    text: "var(--neon-success)",
  },
];

/**
 * Mappe le statut DB (old + new naming) vers une key utilisée par le stepper.
 * Compat : "en_attente" (ancien nom de "recue") → "recue".
 */
function normalizeStatut(raw: string): StatutKey {
  if (raw === "en_attente") return "recue";
  if (raw === "recue") return "recue";
  if (raw === "en_preparation") return "en_preparation";
  if (raw === "expediee") return "expediee";
  if (raw === "livree") return "livree";
  if (raw === "annulee") return "annulee";
  return "recue";
}

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
  const [commandes, invoices, smsPurchases] = await Promise.all([
    listMyBoutiqueCommandes(),
    listStripeInvoices(),
    listMySmsPurchases(),
  ]);

  // Récupère les invoice URLs pour chaque commande boutique (Stripe one-shot)
  const commandesWithInvoices = await Promise.all(
    commandes.map(async (c) => {
      const invoice = await getBoutiqueInvoiceUrls(
        c.stripeCheckoutSessionId ?? null,
      );
      return { ...c, invoice };
    }),
  );

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
        title="BC / Factures"
        description="Suis l'avancement de tes bons de commande boutique, télécharge tes factures et retrouve l'historique de tes achats SMS."
      />

      {/* === COMMANDES BOUTIQUE avec stepper visuel === */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ShoppingBag
              className="size-4 text-[var(--neon-violet)]"
              strokeWidth={1.75}
            />
            Commandes boutique
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
          <ul className="space-y-3">
            {commandesWithInvoices.map((c) => (
              <CommandeCard key={c.id.toString()} commande={c} />
            ))}
          </ul>
        )}
      </section>

      {/* === FACTURES STRIPE ABONNEMENT === (swap : avant SMS, après BC) */}
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
          </Card>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => {
              const tone =
                INVOICE_STATUS_TONE[inv.status] ?? INVOICE_STATUS_TONE.open;
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
                            tone?.classes,
                          )}
                        >
                          {tone?.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                        {inv.createdAt &&
                          format(new Date(inv.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
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

      {/* === ACHATS DE PACKS SMS === (placé en dernier après le swap) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Coins
              className="size-4 text-[var(--accent)]"
              strokeWidth={1.75}
            />
            Achats SMS
            <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {smsPurchases.length}
            </span>
          </h2>
          {smsPurchases.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/sms">Recharger</Link>
            </Button>
          )}
        </div>

        {smsPurchases.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <Coins
              className="size-8 text-[var(--text-tertiary)]"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Aucun achat de SMS pour l&apos;instant
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/dashboard/sms">Voir les packs</Link>
            </Button>
          </Card>
        ) : (
          <ul className="space-y-2">
            {smsPurchases.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-lg",
                      p.status === "paid"
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "bg-[var(--bg-glass-strong)] text-[var(--text-tertiary)]",
                    )}
                  >
                    <Coins className="size-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        {p.invoiceNumber ?? `SMS-${p.id.slice(-8)}`}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        Pack {p.packSize.toLocaleString("fr-FR")} SMS
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          p.status === "paid"
                            ? "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]"
                            : "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
                        )}
                      >
                        {p.status === "paid"
                          ? "Payée"
                          : p.status === "pending"
                            ? "En attente"
                            : "Échec"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {format(
                        new Date(p.paidAt ?? p.createdAt),
                        "d MMM yyyy à HH:mm",
                        { locale: fr },
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
                      {(p.pricePaidCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                    <div className="flex gap-1">
                      {p.invoicePdfUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={p.invoicePdfUrl}
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
                      {p.invoiceUrl && (
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={p.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Voir en ligne"
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============================================================
// COMMANDE CARD avec STEPPER VISUEL
// ============================================================

interface CommandeCardProps {
  commande: BoutiqueCommandeRow & {
    invoice: {
      invoiceUrl: string | null;
      invoicePdfUrl: string | null;
      invoiceNumber: string | null;
    };
  };
}

function CommandeCard({ commande }: CommandeCardProps) {
  const c = commande;
  const statut = normalizeStatut(c.statut);
  const isCancelled = statut === "annulee";
  const currentIndex = isCancelled
    ? -1
    : STATUT_STEPS.findIndex((s) => s.key === statut);

  const firstItem = c.items[0];
  const totalQty = c.items.reduce((s, i) => s + i.quantite, 0);

  return (
    <Card className="overflow-hidden">
      {/* En-tête : photo + nom + prix + bons */}
      <div className="flex items-center gap-4 p-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-glass-strong)]">
          {firstItem?.produit.imageUrl ? (
            <Image
              src={firstItem.produit.imageUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <ImageOff
              className="size-5 text-[var(--text-tertiary)]"
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
                  + {c.items.length - 1} autre{c.items.length - 1 > 1 ? "s" : ""}
                </span>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {totalQty} article{totalQty > 1 ? "s" : ""}  {" "}
            {format(new Date(c.createdAt), "d MMM yyyy", { locale: fr })}
            {c.restaurant && (
              <>
                <span className="mx-1.5"> </span>
                {c.restaurant.nom}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
            {(c.totalCentimes / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: c.devise,
            })}
          </p>
          <div className="flex gap-1">
            {c.invoice.invoicePdfUrl && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={c.invoice.invoicePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Télécharger la facture PDF"
                >
                  <Download className="size-3.5" strokeWidth={1.75} />
                  Facture
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/boutique/commandes/${c.id}`}>
                <FileText className="size-3.5" strokeWidth={1.75} />
                Détail
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stepper 4 étapes ou bandeau "Annulée" */}
      {isCancelled ? (
        <div className="flex items-center gap-2 border-t border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--neon-danger)]">
          <XCircle className="size-4" strokeWidth={1.75} />
          Commande annulée
        </div>
      ) : (
        <div className="border-t border-[var(--border-glass)] bg-[var(--bg-glass)]/30 px-4 py-3">
          <ol className="flex items-center justify-between gap-1 sm:gap-2">
            {STATUT_STEPS.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;
              const Icon = step.icon;

              return (
                <li
                  key={step.key}
                  className="flex flex-1 items-center gap-1 sm:gap-2"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full transition-colors sm:size-9",
                        isPast || isCurrent
                          ? ""
                          : "bg-[var(--bg-glass-strong)] text-[var(--text-tertiary)]",
                      )}
                      style={
                        isPast || isCurrent
                          ? {
                              backgroundColor: step.softBg,
                              color: step.text,
                              border: `1.5px solid ${step.border}`,
                            }
                          : {}
                      }
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isPast ? (
                        <CheckCircle2 className="size-3.5 sm:size-4" />
                      ) : (
                        <Icon className="size-3.5 sm:size-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-center text-[9px] font-medium leading-tight sm:text-[10px]",
                        isCurrent
                          ? "font-bold"
                          : isFuture
                            ? "text-[var(--text-tertiary)]"
                            : "text-[var(--text-secondary)]",
                      )}
                      style={isCurrent ? { color: step.text } : {}}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUT_STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          idx < currentIndex
                            ? STATUT_STEPS[idx]!.color
                            : "var(--border-glass)",
                      }}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
}
