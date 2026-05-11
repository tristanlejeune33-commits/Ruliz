import "server-only";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/session";

/**
 * Récupère TOUTES les commandes boutique, achats SMS et factures Stripe
 * d'un client donné (vue admin). Utilisé dans /admin/clients/[id] pour
 * la section "BC / Factures".
 */

export interface ClientBoutiqueCommande {
  id: string;
  createdAt: string;
  statut: string;
  totalCentimes: number;
  devise: string;
  itemsCount: number;
  firstItemName: string | null;
  firstItemImage: string | null;
  restaurantNom: string | null;
  stripeCheckoutSessionId: string | null;
  invoicePdfUrl: string | null;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
}

export interface ClientSmsPurchase {
  id: string;
  packSize: number;
  pricePaidCentimes: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  invoicePdfUrl: string | null;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
}

export interface ClientStripeInvoice {
  id: string;
  number: string | null;
  status: string;
  amountPaidCentimes: number;
  currency: string;
  createdAt: string | null;
  description: string;
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
}

/**
 * Récupère toutes les commandes boutique d'un client (sans filtre statut).
 * Pour chaque commande payée, jointure avec Stripe pour récupérer l'invoice URL.
 */
export async function listClientBoutiqueCommandesAdmin(
  userId: number,
): Promise<ClientBoutiqueCommande[]> {
  await requireAdmin();

  const commandes = await prisma.boutiqueCommande.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: {
        include: {
          produit: {
            select: { id: true, nom: true, imageUrl: true },
          },
        },
      },
      restaurant: { select: { id: true, nom: true } },
    },
  });

  const stripe = getStripe();

  return Promise.all(
    commandes.map(async (c) => {
      let invoicePdfUrl: string | null = null;
      let invoiceUrl: string | null = null;
      let invoiceNumber: string | null = null;

      if (stripe && c.stripeCheckoutSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            c.stripeCheckoutSessionId,
            { expand: ["invoice"] },
          );
          if (session.invoice && typeof session.invoice !== "string") {
            invoicePdfUrl = session.invoice.invoice_pdf ?? null;
            invoiceUrl = session.invoice.hosted_invoice_url ?? null;
            invoiceNumber = session.invoice.number ?? null;
          }
        } catch (err) {
          console.warn(
            "[admin] retrieve boutique invoice failed:",
            err,
          );
        }
      }

      const firstItem = c.items[0] ?? null;
      return {
        id: c.id.toString(),
        createdAt: c.createdAt.toISOString(),
        statut: c.statut,
        totalCentimes: c.totalCentimes,
        devise: c.devise,
        itemsCount: c.items.reduce((s, i) => s + i.quantite, 0),
        firstItemName: firstItem?.produitNom ?? null,
        firstItemImage: firstItem?.produit.imageUrl ?? null,
        restaurantNom: c.restaurant?.nom ?? null,
        stripeCheckoutSessionId: c.stripeCheckoutSessionId,
        invoicePdfUrl,
        invoiceUrl,
        invoiceNumber,
      };
    }),
  );
}

/**
 * Récupère tous les achats SMS d'un client (via ses restaurants).
 */
export async function listClientSmsPurchasesAdmin(
  userId: number,
): Promise<ClientSmsPurchase[]> {
  await requireAdmin();

  const restaurants = await prisma.restaurant.findMany({
    where: { userId },
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
    console.warn("[admin] listClientSmsPurchases query failed:", err);
    return [];
  }

  const stripe = getStripe();
  return Promise.all(
    purchases.map(async (p) => {
      let invoicePdfUrl: string | null = null;
      let invoiceUrl: string | null = null;
      let invoiceNumber: string | null = null;

      if (stripe && p.stripeSessionId && p.status === "paid") {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            p.stripeSessionId,
            { expand: ["invoice"] },
          );
          if (session.invoice && typeof session.invoice !== "string") {
            invoicePdfUrl = session.invoice.invoice_pdf ?? null;
            invoiceUrl = session.invoice.hosted_invoice_url ?? null;
            invoiceNumber = session.invoice.number ?? null;
          }
        } catch (err) {
          console.warn("[admin] retrieve SMS invoice failed:", err);
        }
      }

      return {
        id: p.id.toString(),
        packSize: p.packSize,
        pricePaidCentimes: p.pricePaidCentimes,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        invoicePdfUrl,
        invoiceUrl,
        invoiceNumber,
      };
    }),
  );
}

/**
 * Récupère les factures Stripe (abonnements Pro/Premium) du client.
 */
export async function listClientStripeInvoicesAdmin(
  userId: number,
): Promise<ClientStripeInvoice[]> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return [];

  const stripe = getStripe();
  if (!stripe) return [];

  try {
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
    });
    return invoices.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: inv.status ?? "open",
      amountPaidCentimes: inv.amount_paid ?? 0,
      currency: (inv.currency ?? "eur").toUpperCase(),
      createdAt: inv.created
        ? new Date(inv.created * 1000).toISOString()
        : null,
      description:
        inv.lines.data[0]?.description ??
        inv.description ??
        "Abonnement Ruliz",
      invoicePdfUrl: inv.invoice_pdf ?? null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    }));
  } catch (err) {
    console.error("[admin] listClientStripeInvoices error:", err);
    return [];
  }
}
