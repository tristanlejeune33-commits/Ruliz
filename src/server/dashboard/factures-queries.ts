import "server-only";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getActingUserId } from "@/lib/impersonation";

/**
 * Récupère les factures Stripe (invoices) du user courant · celles liées à
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

/**
 * Liste les achats de packs SMS du user avec leurs URLs de facture Stripe.
 * Combine la table sms_credit_purchases (vérité Ruliz) avec les invoices
 * Stripe (PDF officiel + statut).
 */
export async function listMySmsPurchases(): Promise<
  Array<{
    id: string;
    packSize: number;
    pricePaidCentimes: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    stripeSessionId: string | null;
    invoiceUrl: string | null;
    invoicePdfUrl: string | null;
    invoiceNumber: string | null;
  }>
> {
  const acting = await getActingUserId();
  if (!acting) return [];

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: acting.actingUserId },
    select: { id: true },
  });
  if (restaurants.length === 0) return [];
  const restoIds = restaurants.map((r) => r.id);

  let purchases: Array<{
    id: bigint;
    packSize: number;
    pricePaidCentimes: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    stripeSessionId: string | null;
  }>;

  try {
    purchases = (await prisma.$queryRawUnsafe(
      `SELECT id, pack_size AS "packSize", price_paid_centimes AS "pricePaidCentimes",
              status, created_at AS "createdAt", paid_at AS "paidAt",
              stripe_session_id AS "stripeSessionId"
       FROM sms_credit_purchases
       WHERE restaurant_id = ANY($1::bigint[])
       ORDER BY created_at DESC
       LIMIT 100`,
      restoIds,
    )) as typeof purchases;
  } catch (err) {
    console.warn("[factures] listMySmsPurchases query failed:", err);
    return [];
  }

  // Pour chaque achat payé avec une session Stripe, récupère l'invoice
  const stripe = getStripe();
  const enriched = await Promise.all(
    purchases.map(async (p) => {
      let invoiceUrl: string | null = null;
      let invoicePdfUrl: string | null = null;
      let invoiceNumber: string | null = null;

      if (stripe && p.stripeSessionId && p.status === "paid") {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            p.stripeSessionId,
            { expand: ["invoice"] },
          );
          if (session.invoice && typeof session.invoice !== "string") {
            invoiceUrl = session.invoice.hosted_invoice_url ?? null;
            invoicePdfUrl = session.invoice.invoice_pdf ?? null;
            invoiceNumber = session.invoice.number ?? null;
          }
        } catch (err) {
          console.warn("[factures] retrieve SMS invoice failed:", err);
        }
      }

      return {
        id: p.id.toString(),
        packSize: p.packSize,
        pricePaidCentimes: p.pricePaidCentimes,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        stripeSessionId: p.stripeSessionId,
        invoiceUrl,
        invoicePdfUrl,
        invoiceNumber,
      };
    }),
  );

  return enriched;
}

export type SmsPurchaseRow = Awaited<
  ReturnType<typeof listMySmsPurchases>
>[number];

/**
 * Pour une commande boutique : récupère l'URL d'invoice Stripe associée
 * (générée par invoice_creation: { enabled: true } au moment du Checkout).
 */
export async function getBoutiqueInvoiceUrls(
  stripeCheckoutSessionId: string | null,
): Promise<{
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
  invoiceNumber: string | null;
}> {
  if (!stripeCheckoutSessionId) {
    return { invoiceUrl: null, invoicePdfUrl: null, invoiceNumber: null };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { invoiceUrl: null, invoicePdfUrl: null, invoiceNumber: null };
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(
      stripeCheckoutSessionId,
      { expand: ["invoice"] },
    );
    if (session.invoice && typeof session.invoice !== "string") {
      return {
        invoiceUrl: session.invoice.hosted_invoice_url ?? null,
        invoicePdfUrl: session.invoice.invoice_pdf ?? null,
        invoiceNumber: session.invoice.number ?? null,
      };
    }
  } catch (err) {
    console.warn("[factures] retrieve boutique invoice failed:", err);
  }
  return { invoiceUrl: null, invoicePdfUrl: null, invoiceNumber: null };
}
