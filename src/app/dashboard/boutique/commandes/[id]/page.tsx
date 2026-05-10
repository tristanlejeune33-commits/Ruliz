import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";
import { isStripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";
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

export default async function CommandeDetailPage({
  params,
  searchParams,
}: PageProps) {
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
      restaurant: { select: { id: true, nom: true } },
      user: {
        select: {
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
        },
      },
    },
  });
  if (!commande) notFound();

  const tone = STATUT_TONE[commande.statut] ?? {
    label: "En attente",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  };
  const fullName =
    [commande.user.prenom, commande.user.nom].filter(Boolean).join(" ") ||
    commande.user.email;

  return (
    <div className="space-y-6">
      {/* Header — non imprimé */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/settings/factures">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Mes commandes & factures
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

      {/* Bandeau retour Stripe — succès / annulation */}
      {sp.checkout === "success" && !commande.paidAt && (
        <Card className="border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] p-4 text-center text-sm text-[var(--text-primary)] print:hidden">
          ✅ Paiement confirmé. La mise à jour est en cours via Stripe — recharge
          la page dans quelques secondes si le statut n&apos;a pas encore changé.
        </Card>
      )}
      {sp.checkout === "cancel" && (
        <Card className="border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] p-4 text-center text-sm text-[var(--text-primary)] print:hidden">
          Paiement annulé. Tu peux réessayer ci-dessus à tout moment.
        </Card>
      )}

      {/* Bon de commande imprimable */}
      <Card className="mx-auto max-w-3xl space-y-8 p-8 print:border-none print:bg-white print:p-0 print:shadow-none">
        {/* En-tête : logo + numéro */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-glass)] pb-6 print:border-neutral-300">
          <div>
            <Logo variant="full" />
            <p className="mt-2 text-xs text-[var(--text-tertiary)] print:text-neutral-600">
              Ruliz · Menus digitaux pour restaurants
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Bon de commande
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)] print:text-black">
              BC-{commande.id.toString()}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] print:text-neutral-700">
              {format(new Date(commande.createdAt), "d MMMM yyyy", {
                locale: fr,
              })}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium print:hidden",
                tone.classes,
              )}
            >
              {tone.label}
            </span>
          </div>
        </div>

        {/* Client + Livraison */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Client
            </p>
            <p className="mt-1 font-semibold text-[var(--text-primary)] print:text-black">
              {fullName}
            </p>
            <p className="text-xs text-[var(--text-secondary)] print:text-neutral-700">
              {commande.user.email}
            </p>
            {commande.user.telephone && (
              <p className="font-mono text-xs text-[var(--text-secondary)] print:text-neutral-700">
                {commande.user.telephone}
              </p>
            )}
            {commande.restaurant && (
              <p className="mt-1 text-xs text-[var(--text-tertiary)] print:text-neutral-600">
                Restaurant : {commande.restaurant.nom}
              </p>
            )}
          </div>
          <div>
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
                Tél : {commande.livraisonTelephone}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
            Articles
          </p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-glass)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] print:border-neutral-300 print:text-neutral-500">
                <th className="w-14 py-2"></th>
                <th className="py-2">Produit</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">Prix HT</th>
                <th className="py-2 text-right">Total</th>
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
                    {(item.prixUnitaire / 100).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: commande.devise,
                    })}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold tabular-nums">
                    {(item.totalCentimes / 100).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: commande.devise,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-4 text-right font-semibold">
                  Total HT
                </td>
                <td className="py-4 text-right font-mono text-xl font-bold tabular-nums text-[var(--text-primary)] print:text-black">
                  {(commande.totalCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: commande.devise,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {commande.notesClient && (
          <div className="rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 print:border-neutral-300 print:bg-neutral-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] print:text-neutral-500">
              Notes du client
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)] print:text-black">
              {commande.notesClient}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[var(--border-glass)] pt-6 text-center text-xs text-[var(--text-tertiary)] print:border-neutral-300 print:text-neutral-500">
          Ruliz — Bon de commande non contractuel · Une facture sera émise après
          paiement.
        </div>
      </Card>
    </div>
  );
}
