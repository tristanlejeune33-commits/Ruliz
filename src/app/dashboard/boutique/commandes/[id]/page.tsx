import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";
import { isStripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { getCompanyInfo, splitTtc } from "@/lib/company-info";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { PayButton } from "./pay-button";
import { PrintButton } from "./print-button";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}

export const metadata: Metadata = {
  title: "Bon de commande · Ruliz",
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

function fmt(centimes: number, devise: string): string {
  return (centimes / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: devise,
  });
}

/**
 * Numéro de facture / BC.
 * - Non payée : BC-YYYY-XXXXXX (préfixe Bon de commande, pas comptable)
 * - Payée    : FAC-YYYY-XXXXXX (préfixe Facture, série annuelle continue)
 * Le numéro reste basé sur l'ID interne · garantit l'unicité + l'ordre légal
 * (en France les factures doivent avoir une numérotation chronologique sans
 * trou). On préfixe avec l'année de paiement pour la lisibilité.
 */
function documentNumber(opts: {
  id: bigint;
  paidAt: Date | null;
  createdAt: Date;
}): { label: string; ref: string } {
  const year = (opts.paidAt ?? opts.createdAt).getFullYear();
  const padded = opts.id.toString().padStart(6, "0");
  if (opts.paidAt) {
    return { label: "Facture", ref: `FAC-${year}-${padded}` };
  }
  return { label: "Bon de commande", ref: `BC-${year}-${padded}` };
}

/**
 * Échéance par défaut sur un bon de commande non payé : 14 jours après la
 * date de création. Conforme aux pratiques B2B FR (max 60 jours date facture
 * ou 45 jours fin de mois · on reste prudent).
 */
function dueDate(createdAt: Date): Date {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 14);
  return d;
}

export default async function CommandeDetailPage({
  params,
  searchParams,
}: PageProps) {
  await ensureRuntimeSchema();
  const { id } = await params;
  const sp = await searchParams;
  const acting = await getActingUserId();
  if (!acting) notFound();

  let bigId: bigint;
  try {
    bigId = BigInt(id);
  } catch {
    notFound();
  }

  const commande = await prisma.boutiqueCommande.findFirst({
    where: { id: bigId, userId: acting.actingUserId },
    include: {
      items: {
        include: {
          produit: {
            select: { id: true, nom: true, slug: true, imageUrl: true },
          },
        },
      },
      restaurant: {
        select: {
          id: true,
          nom: true,
          adresse: true,
          codePostal: true,
          ville: true,
          pays: true,
          telephone: true,
        },
      },
      user: {
        select: {
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
          adresse: true,
          codePostal: true,
          ville: true,
          pays: true,
        },
      },
    },
  });
  if (!commande) notFound();

  // shipping_centimes via raw SQL (la colonne n'est pas dans Prisma schema)
  const shippingRows = (await prisma
    .$queryRawUnsafe(
      `SELECT shipping_centimes AS "shippingCentimes" FROM boutique_commandes WHERE id = $1`,
      bigId,
    )
    .catch(() => [])) as Array<{ shippingCentimes: number }>;
  const shippingCentimes = shippingRows[0]?.shippingCentimes ?? 0;
  const subtotalCentimes = Math.max(
    0,
    commande.totalCentimes - shippingCentimes,
  );

  const company = getCompanyInfo();
  const totals = splitTtc(commande.totalCentimes, company.vatRate);
  const subtotalSplit = splitTtc(subtotalCentimes, company.vatRate);
  const shippingSplit = splitTtc(shippingCentimes, company.vatRate);

  const isPaid = !!commande.paidAt;
  const doc = documentNumber({
    id: commande.id,
    paidAt: commande.paidAt,
    createdAt: commande.createdAt,
  });
  const due = !isPaid ? dueDate(commande.createdAt) : null;

  const tone = STATUT_TONE[commande.statut] ?? {
    label: "En attente",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  };
  const fullName =
    [commande.user.prenom, commande.user.nom].filter(Boolean).join(" ") ||
    commande.user.email;

  // Référence Stripe abrégée (8 derniers chars du PaymentIntent)
  const stripeRef = commande.stripePaymentIntentId
    ? commande.stripePaymentIntentId.slice(-8).toUpperCase()
    : null;

  return (
    <div className="space-y-6">
      {/* Barre de navigation · non imprimée */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/settings/factures">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Mes commandes &amp; factures
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <PayButton
            commandeId={commande.id.toString()}
            paidAt={commande.paidAt?.toISOString() ?? null}
            stripeConfigured={isStripeConfigured()}
            isAnnulee={commande.statut === "annulee"}
          />
          <PrintButton />
        </div>
      </div>

      {/* Bandeau retour Stripe · succès / annulation */}
      {sp.checkout === "success" && !commande.paidAt && (
        <Card className="border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] p-4 text-center text-sm text-[var(--text-primary)] print:hidden">
          ✅ Paiement confirmé. La mise à jour est en cours via Stripe ·
          recharge la page dans quelques secondes si le statut n&apos;a pas
          encore changé.
        </Card>
      )}
      {sp.checkout === "cancel" && (
        <Card className="border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] p-4 text-center text-sm text-[var(--text-primary)] print:hidden">
          Paiement annulé. Tu peux réessayer ci-dessus à tout moment.
        </Card>
      )}

      {/* === Document imprimable === */}
      <Card
        className={cn(
          "print-document relative mx-auto max-w-4xl space-y-7 p-8 sm:p-10",
          "print:rounded-none print:shadow-none print:border-none",
        )}
      >
        {/* Tampon "PAYÉ" en overlay (visible à l'impression aussi) */}
        {isPaid && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-10 top-32 -rotate-12 select-none print:right-12 print:top-40"
          >
            <div className="rounded-md border-4 border-[var(--neon-success)] px-6 py-2 font-mono text-3xl font-black uppercase tracking-widest text-[var(--neon-success)] opacity-25 print:border-[#16a34a] print:text-[#16a34a]">
              Payé
            </div>
          </div>
        )}

        {/* En-tête : émetteur + numéro */}
        <div className="flex flex-col gap-6 border-b border-[var(--border-glass)] pb-6 sm:flex-row sm:justify-between print:border-neutral-300">
          {/* Émetteur Ruliz */}
          <div className="space-y-1">
            <Logo variant="full" />
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] print:text-neutral-600">
              {company.name}
            </p>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)] print:text-neutral-700">
              {company.address}
              <br />
              {company.city}
              <br />
              {company.email}
              {company.phone && (
                <>
                  <br />
                  Tél : {company.phone}
                </>
              )}
            </p>
            {(company.siret || company.tva) && (
              <p className="pt-1 font-mono text-[10px] text-[var(--text-tertiary)] print:text-neutral-500">
                {company.siret && <>SIRET&nbsp;: {company.siret}</>}
                {company.siret && company.tva && " · "}
                {company.tva && <>TVA&nbsp;: {company.tva}</>}
              </p>
            )}
          </div>

          {/* Bloc numéro de document */}
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              {doc.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)] print:text-black">
              {doc.ref}
            </p>
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-[var(--text-secondary)] print:text-neutral-700">
                <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                  Émis le{" "}
                </span>
                <span className="font-medium text-[var(--text-primary)] print:text-black">
                  {format(new Date(commande.createdAt), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </p>
              {isPaid && commande.paidAt && (
                <p className="text-[var(--text-secondary)] print:text-neutral-700">
                  <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                    Payée le{" "}
                  </span>
                  <span className="font-medium text-[var(--neon-success)] print:text-[#16a34a]">
                    {format(new Date(commande.paidAt), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </p>
              )}
              {!isPaid && due && (
                <p className="text-[var(--text-secondary)] print:text-neutral-700">
                  <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                    Échéance{" "}
                  </span>
                  <span className="font-medium text-[var(--text-primary)] print:text-black">
                    {format(due, "d MMMM yyyy", { locale: fr })}
                  </span>
                </p>
              )}
            </div>
            <span
              className={cn(
                "mt-3 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium print:hidden",
                tone.classes,
              )}
            >
              {tone.label}
            </span>
          </div>
        </div>

        {/* Client + Livraison (flex pour échapper au print:block-grid) */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Facturé à
            </p>
            <p className="mt-1 font-semibold text-[var(--text-primary)] print:text-black">
              {fullName}
            </p>
            {commande.restaurant && (
              <p className="text-sm font-medium text-[var(--text-secondary)] print:text-neutral-700">
                {commande.restaurant.nom}
              </p>
            )}
            {(commande.user.adresse || commande.restaurant?.adresse) && (
              <p className="text-xs text-[var(--text-secondary)] print:text-neutral-700">
                {commande.user.adresse || commande.restaurant?.adresse}
              </p>
            )}
            <p className="text-xs text-[var(--text-secondary)] print:text-neutral-700">
              {[
                commande.user.codePostal || commande.restaurant?.codePostal,
                commande.user.ville || commande.restaurant?.ville,
                commande.user.pays || commande.restaurant?.pays,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] print:text-neutral-700">
              {commande.user.email}
            </p>
            {commande.user.telephone && (
              <p className="font-mono text-xs text-[var(--text-secondary)] print:text-neutral-700">
                Tél&nbsp;: {commande.user.telephone}
              </p>
            )}
          </div>
          <div className="flex-1 border-l border-[var(--border-glass)] pl-6 print:border-neutral-300 max-sm:border-l-0 max-sm:pl-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Livraison
            </p>
            <p className="mt-1 font-semibold text-[var(--text-primary)] print:text-black">
              {commande.livraisonNom ?? fullName}
            </p>
            {commande.livraisonAdresse && (
              <p className="text-xs text-[var(--text-secondary)] print:text-neutral-700">
                {commande.livraisonAdresse}
              </p>
            )}
            <p className="text-xs text-[var(--text-secondary)] print:text-neutral-700">
              {[
                commande.livraisonCodePostal,
                commande.livraisonVille,
                commande.livraisonPays,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {commande.livraisonTelephone && (
              <p className="font-mono text-xs text-[var(--text-secondary)] print:text-neutral-700">
                Tél&nbsp;: {commande.livraisonTelephone}
              </p>
            )}
          </div>
        </div>

        {/* === Articles === */}
        <div className="print-avoid-break">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
            Articles
          </p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-glass)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] print:border-neutral-300 print:text-neutral-500">
                <th className="w-14 py-2"></th>
                <th className="py-2">Produit</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">
                  {company.vatRate > 0 ? "P.U. TTC" : "Prix unitaire"}
                </th>
                <th className="py-2 text-right">
                  {company.vatRate > 0 ? "Total TTC" : "Total"}
                </th>
              </tr>
            </thead>
            <tbody>
              {commande.items.map((item) => (
                <tr
                  key={item.id.toString()}
                  className="border-b border-[var(--border-glass)] print:border-neutral-200"
                >
                  <td className="py-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded bg-[var(--bg-glass-strong)] print:bg-neutral-100">
                      {item.produit.imageUrl ? (
                        <Image
                          src={item.produit.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageOff
                          className="size-4 text-[var(--text-tertiary)] print:text-neutral-400"
                          strokeWidth={1.75}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <p className="font-medium text-[var(--text-primary)] print:text-black">
                      {item.produitNom}
                    </p>
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {item.quantite}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {fmt(item.prixUnitaire, commande.devise)}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold tabular-nums">
                    {fmt(item.totalCentimes, commande.devise)}
                  </td>
                </tr>
              ))}
              {shippingCentimes > 0 && (
                <tr className="border-b border-[var(--border-glass)] print:border-neutral-200">
                  <td className="py-3">
                    <div className="flex size-10 items-center justify-center rounded bg-[var(--bg-glass-strong)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] print:bg-neutral-100 print:text-neutral-500">
                      Port
                    </div>
                  </td>
                  <td className="py-3">
                    <p className="font-medium text-[var(--text-primary)] print:text-black">
                      Frais de port
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] print:text-neutral-500">
                      France métropolitaine
                    </p>
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums">1</td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {fmt(shippingCentimes, commande.devise)}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold tabular-nums">
                    {fmt(shippingCentimes, commande.devise)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* === Récap totaux === */}
        <div className="flex justify-end print-avoid-break">
          <div className="w-full max-w-sm space-y-2 text-sm">
            {/* Lignes intermédiaires si TVA active */}
            {company.vatRate > 0 ? (
              <>
                <div className="flex justify-between text-[var(--text-secondary)] print:text-neutral-700">
                  <span>Sous-total articles HT</span>
                  <span className="font-mono tabular-nums">
                    {fmt(subtotalSplit.htCentimes, commande.devise)}
                  </span>
                </div>
                {shippingCentimes > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)] print:text-neutral-700">
                    <span>Frais de port HT</span>
                    <span className="font-mono tabular-nums">
                      {fmt(shippingSplit.htCentimes, commande.devise)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--border-glass)] pt-2 text-[var(--text-secondary)] print:border-neutral-300 print:text-neutral-700">
                  <span>Total HT</span>
                  <span className="font-mono tabular-nums">
                    {fmt(totals.htCentimes, commande.devise)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)] print:text-neutral-700">
                  <span>
                    TVA{" "}
                    <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                      ({(company.vatRate * 100).toFixed(0)}%)
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {fmt(totals.vatCentimes, commande.devise)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-[var(--text-secondary)] print:text-neutral-700">
                  <span>Sous-total articles</span>
                  <span className="font-mono tabular-nums">
                    {fmt(subtotalCentimes, commande.devise)}
                  </span>
                </div>
                {shippingCentimes > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)] print:text-neutral-700">
                    <span>Frais de port</span>
                    <span className="font-mono tabular-nums">
                      {fmt(shippingCentimes, commande.devise)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Total final */}
            <div className="flex items-baseline justify-between border-t-2 border-[var(--text-primary)] pt-3 print:border-black">
              <span className="text-base font-bold text-[var(--text-primary)] print:text-black">
                {company.vatRate > 0 ? "Total TTC" : "Total à payer"}
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)] print:text-black">
                {fmt(commande.totalCentimes, commande.devise)}
              </span>
            </div>

            {/* Mention TVA non applicable si vatRate=0 */}
            {company.vatRate === 0 && (
              <p className="pt-1 text-[10px] italic text-[var(--text-tertiary)] print:text-neutral-500">
                TVA non applicable, art. 293 B du CGI
              </p>
            )}
          </div>
        </div>

        {/* === Bloc paiement (si payée) ou règlement (si pas encore) === */}
        {isPaid ? (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] p-4 print-avoid-break print:border-[#16a34a] print:bg-[#f0fdf4]">
            <CheckCircle2
              className="size-5 shrink-0 text-[var(--neon-success)] print:text-[#16a34a]"
              strokeWidth={2}
            />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-[var(--text-primary)] print:text-black">
                Facture acquittée
              </p>
              <p className="text-[var(--text-secondary)] print:text-neutral-700">
                Réglée par carte bancaire via Stripe le{" "}
                {commande.paidAt &&
                  format(new Date(commande.paidAt), "d MMMM yyyy à HH'h'mm", {
                    locale: fr,
                  })}
                .
                {stripeRef && (
                  <>
                    {" "}
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)] print:text-neutral-500">
                      Réf. Stripe : …{stripeRef}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          commande.statut !== "annulee" && (
            <div className="rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 text-xs print-avoid-break print:border-neutral-300 print:bg-neutral-50">
              <p className="font-semibold text-[var(--text-primary)] print:text-black">
                Modalités de règlement
              </p>
              <p className="mt-1 text-[var(--text-secondary)] print:text-neutral-700">
                Paiement par carte bancaire en ligne via Stripe (lien sécurisé
                envoyé par email) ou par virement bancaire · à réception de la
                commande, échéance{" "}
                {due &&
                  format(due, "d MMMM yyyy", {
                    locale: fr,
                  })}
                .
              </p>
              {(company.iban || company.bic) && (
                <div className="mt-2 grid gap-1 font-mono text-[11px] text-[var(--text-secondary)] print:text-neutral-700">
                  {company.iban && (
                    <span>
                      <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                        IBAN :{" "}
                      </span>
                      {company.iban}
                    </span>
                  )}
                  {company.bic && (
                    <span>
                      <span className="text-[var(--text-tertiary)] print:text-neutral-500">
                        BIC :{" "}
                      </span>
                      {company.bic}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* === Notes client === */}
        {commande.notesClient && (
          <div className="rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 print-avoid-break print:border-neutral-300 print:bg-neutral-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Notes du client
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)] print:text-black">
              {commande.notesClient}
            </p>
          </div>
        )}

        {/* === Pied de page === */}
        <div className="space-y-2 border-t border-[var(--border-glass)] pt-5 text-center text-[10px] leading-relaxed text-[var(--text-tertiary)] print:border-neutral-300 print:text-neutral-500">
          {!isPaid && (
            <p>
              Ce bon de commande n&apos;est pas contractuel. Une facture
              définitive sera émise après réception du paiement.
            </p>
          )}
          {isPaid && company.vatRate > 0 && (
            <p>
              TVA acquittée sur les encaissements · Conserver cette facture
              pendant 10 ans (art. L123-22 Code de commerce).
            </p>
          )}
          <p className="font-mono uppercase tracking-wider">
            {[company.name, company.city]
              .filter(Boolean)
              .join(" · ")}
            {company.siret && <> · SIRET {company.siret}</>}
            {company.rcs && <> · {company.rcs}</>}
            {company.capital && <> · Capital {company.capital}</>}
          </p>
        </div>
      </Card>
    </div>
  );
}
