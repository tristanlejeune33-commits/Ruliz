import "server-only";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getActingUserId } from "@/lib/impersonation";

/**
 * Récupère les factures Stripe (invoices) du user courant — celles liées à
 * son abonnement Pro/Premium. Utilise stripe.invoices.list filtré par
 * customer ID stocké sur la table users.
 *
 * Retourne array vide si :
 *   - Stripe pas configuré
 *   - Pas de stripeCustomerId sur le user (jamais payé)
 *   - Aucune invoice trouvée
 */
export async function listStripeInvoices() {
  const acting = await getActingUserId();
  if (!acting) return [];

  const user = await prisma.user.findUnique({
    where: { id: acting.actingUserId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return [];

  const stripe = getStripe();
  if (!stripe) return [];

  try {
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
      expand: ["data.charge"],
    });

    return invoices.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: inv.status ?? "open",
      amountPaidCentimes: inv.amount_paid ?? 0,
      amountDueCentimes: inv.amount_due ?? 0,
      currency: (inv.currency ?? "eur").toUpperCase(),
      createdAt: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdfUrl: inv.invoice_pdf ?? null,
      description:
        inv.lines.data[0]?.description ??
        inv.description ??
        "Abonnement Ruliz",
      periodStart: inv.period_start
        ? new Date(inv.period_start * 1000).toISOString()
        : null,
      periodEnd: inv.period_end
        ? new Date(inv.period_end * 1000).toISOString()
        : null,
    }));
  } catch (err) {
    console.error("[stripe.invoices.list] error:", err);
    return [];
  }
}

export type StripeInvoiceRow = Awaited<
  ReturnType<typeof listStripeInvoices>
>[number];
