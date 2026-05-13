import "server-only";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

/**
 * Récupère TOUTES les factures Stripe (tous customers confondus) réservé
 * à l'admin. Cap à 200 pour ne pas spammer l'API Stripe ; pour l'historique
 * complet, l'admin va dans le Dashboard Stripe directement.
 *
 * Pour chaque invoice, on jointure avec la table users via stripeCustomerId
 * pour obtenir le nom + email du restaurateur.
 */
export async function listAllStripeInvoicesAdmin() {
  const stripe = getStripe();
  if (!stripe) return [];

  try {
    // 200 dernières factures (Stripe limite à 100 par page → 2 pages)
    const page1 = await stripe.invoices.list({
      limit: 100,
      expand: ["data.customer"],
    });
    let allInvoices = page1.data;
    if (page1.has_more && allInvoices.length > 0) {
      const lastId = allInvoices[allInvoices.length - 1]?.id;
      if (lastId) {
        const page2 = await stripe.invoices.list({
          limit: 100,
          starting_after: lastId,
          expand: ["data.customer"],
        });
        allInvoices = allInvoices.concat(page2.data);
      }
    }

    // Map customer ID → user pour enrichissement
    const customerIds = Array.from(
      new Set(
        allInvoices
          .map((inv) =>
            typeof inv.customer === "string"
              ? inv.customer
              : inv.customer?.id ?? null,
          )
          .filter((x): x is string => x !== null),
      ),
    );

    const users = customerIds.length
      ? await prisma.user.findMany({
          where: { stripeCustomerId: { in: customerIds } },
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            stripeCustomerId: true,
          },
        })
      : [];
    const usersByCustomer = new Map(
      users.map((u) => [u.stripeCustomerId ?? "", u]),
    );

    return allInvoices.map((inv) => {
      const customerId =
        typeof inv.customer === "string"
          ? inv.customer
          : inv.customer?.id ?? null;
      const user = customerId ? usersByCustomer.get(customerId) ?? null : null;
      return {
        id: inv.id ?? "",
        number: inv.number ?? null,
        status: inv.status ?? "open",
        amountPaidCentimes: inv.amount_paid ?? 0,
        amountDueCentimes: inv.amount_due ?? 0,
        currency: (inv.currency ?? "eur").toUpperCase(),
        createdAt: inv.created
          ? new Date(inv.created * 1000).toISOString()
          : null,
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
        // Enrichissement user
        user: user
          ? {
              id: user.id,
              email: user.email,
              fullName:
                [user.prenom, user.nom].filter(Boolean).join(" ") ||
                user.email,
            }
          : null,
        customerId,
      };
    });
  } catch (err) {
    console.error("[admin.stripe.invoices.list] error:", err);
    return [];
  }
}

export type AdminStripeInvoice = Awaited<
  ReturnType<typeof listAllStripeInvoicesAdmin>
>[number];

/**
 * KPIs admin pour la page factures.
 * Calcule :
 *  - Nombre total d'invoices Stripe sur les 100 dernières
 *  - Montant total payé (TTC)
 *  - Nombre d'invoices impayées
 *  - Nombre de BC boutique en cours (statut != livree && != annulee)
 */
export async function getAdminFacturesStats(invoices: AdminStripeInvoice[]) {
  const totalPaidCentimes = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amountPaidCentimes, 0);
  const unpaidCount = invoices.filter(
    (i) => i.status === "open" || i.status === "uncollectible",
  ).length;

  const bcEnCours = await prisma.boutiqueCommande.count({
    where: { statut: { notIn: ["livree", "annulee"] } },
  });
  const bcEnAttente = await prisma.boutiqueCommande.count({
    where: { statut: "en_attente" },
  });

  return {
    totalInvoices: invoices.length,
    totalPaidCentimes,
    unpaidCount,
    bcEnCours,
    bcEnAttente,
  };
}
