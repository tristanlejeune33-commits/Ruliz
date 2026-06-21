import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { type Plan } from "@/lib/plans";
import { resolvePlanFromPriceId } from "@/lib/plan-config";
import {
  sendSmsPackConfirmation,
  sendBoutiquePaidConfirmation,
} from "@/server/sms/emails";
import { archiveInvoice } from "@/server/billing/invoice-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const stripe = getStripe()!;
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe.webhook] signature verification failed", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // === Idempotence : Stripe peut envoyer le même event plusieurs fois
  // (retry sur timeout réseau, replay manuel depuis le dashboard, etc.).
  // On vérifie en DB qu'on ne l'a pas déjà traité sinon on renvoie 200
  // immédiatement pour acquitter sans rejouer le handler.
  await ensureRuntimeSchema();
  try {
    const seen = (await prisma.$queryRawUnsafe(
      `SELECT event_id FROM stripe_processed_events WHERE event_id = $1 LIMIT 1`,
      event.id,
    )) as Array<{ event_id: string }>;
    if (seen.length > 0) {
      console.log(
        `[stripe.webhook] event ${event.id} (${event.type}) already processed, skipping`,
      );
      return NextResponse.json({ received: true, deduped: true });
    }
  } catch (err) {
    // Si la table n'existe pas encore (schema drift), on log et on continue
    // perdre l'idempotence est moins grave que de manquer un webhook.
    console.warn(
      "[stripe.webhook] idempotence check failed, processing anyway:",
      err,
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        // Ignorer le reste
        break;
    }
  } catch (err) {
    console.error(`[stripe.webhook] handler error for ${event.type}:`, err);
    // On NE marque PAS comme traité si le handler a échoué Stripe va
    // retry, et l'idempotence n'empêchera pas le retry de fonctionner.
    return NextResponse.json(
      { error: "Erreur de traitement" },
      { status: 500 },
    );
  }

  // Marque l'event comme traité (idempotence). best-effort : si l'INSERT
  // échoue (ex: doublon en course concurrence), on log mais on renvoie 200
  // au webhook car le handler a réussi.
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO stripe_processed_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      event.id,
      event.type,
    );
  } catch (err) {
    console.warn("[stripe.webhook] mark processed failed:", err);
  }

  return NextResponse.json({ received: true });
}

// ---------------- Handlers ----------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // === Mode "subscription" : abonnement Pro/Premium ===
  const restaurantId = session.metadata?.ruliz_restaurant_id;
  if (restaurantId && session.subscription) {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    // The subscription updated event will follow with full data ; we just bind here.
    await prisma.restaurant.updateMany({
      where: { id: BigInt(restaurantId) },
      data: { stripeSubscriptionId: subId },
    });
    return;
  }

  // === Mode "payment" : achat de pack SMS (one-shot) ===
  const smsPurchaseId = session.metadata?.ruliz_sms_purchase_id;
  const smsRestaurantId = session.metadata?.ruliz_sms_restaurant_id;
  const smsPackSize = session.metadata?.ruliz_sms_pack_size;
  if (smsPurchaseId && smsRestaurantId && smsPackSize && session.mode === "payment") {
    try {
      const purchaseBigId = BigInt(smsPurchaseId);
      const restoBigId = BigInt(smsRestaurantId);
      const size = parseInt(smsPackSize, 10);
      if (!Number.isFinite(size) || size <= 0) {
        console.warn("[stripe.webhook] invalid sms_pack_size:", smsPackSize);
        return;
      }

      // 1. Marque l'achat comme payé (idempotent via UNIQUE stripe_session_id)
      await prisma.$executeRawUnsafe(
        `UPDATE sms_credit_purchases
         SET status = 'paid', paid_at = NOW(), stripe_session_id = $2
         WHERE id = $1 AND status != 'paid'`,
        purchaseBigId,
        session.id,
      );

      // 2. Crédite le solde du restaurant (atomique, crée la ligne si absente)
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_balance (restaurant_id, balance, total_acquired, total_spent)
         VALUES ($1, $2, $2, 0)
         ON CONFLICT (restaurant_id)
         DO UPDATE SET
           balance = sms_balance.balance + EXCLUDED.balance,
           total_acquired = sms_balance.total_acquired + EXCLUDED.total_acquired,
           updated_at = NOW()`,
        restoBigId,
        size,
      );

      console.log(
        `[stripe.webhook] SMS pack credited : restaurant ${smsRestaurantId} +${size} SMS`,
      );

      // 3. Email de confirmation au client (best-effort, non bloquant)
      const amountTotal = session.amount_total ?? 0;
      try {
        await sendSmsPackConfirmation({
          restaurantId: restoBigId,
          packSize: size,
          pricePaidCentimes: amountTotal,
        });
      } catch (err) {
        console.error("[stripe.webhook] SMS confirmation email failed:", err);
      }

      // 4. Archive comptable (DB + R2 PDF si Stripe a généré une invoice)
      try {
        const resto = await prisma.restaurant.findUnique({
          where: { id: restoBigId },
          select: { userId: true },
        });
        if (resto?.userId) {
          await archiveSmsPurchase({
            userId: resto.userId,
            restaurantId: restoBigId,
            session,
            packSize: size,
          });
        }
      } catch (err) {
        console.error("[stripe.webhook] SMS archive failed:", err);
      }
    } catch (err) {
      console.error("[stripe.webhook] SMS pack crediting failed:", err);
    }
    return;
  }

  // === Mode "payment" : commande boutique QR (one-shot) ===
  const commandeId = session.metadata?.ruliz_boutique_commande_id;
  if (commandeId && session.mode === "payment") {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    let bigId: bigint;
    try {
      bigId = BigInt(commandeId);
    } catch {
      console.warn(
        "[stripe.webhook] invalid boutique_commande_id metadata:",
        commandeId,
      );
      return;
    }

    const updateResult = await prisma.boutiqueCommande.updateMany({
      where: { id: bigId, paidAt: null },
      data: {
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
        // Optionnel : passer en "en_preparation" automatiquement après paiement
        // pour signaler à l'admin que c'est prêt à expédier
        statut: "en_preparation",
      },
    });
    console.log(
      `[stripe.webhook] boutique commande ${commandeId} paid (PI: ${paymentIntentId})`,
    );

    // Email de confirmation paiement au client (best-effort, non bloquant).
    // Skip si l'update n'a rien fait (déjà payée → email déjà envoyé).
    if (updateResult.count > 0) {
      try {
        await sendBoutiquePaidConfirmation({
          commandeId: bigId,
          paidCentimes: session.amount_total ?? 0,
        });
      } catch (err) {
        console.error(
          "[stripe.webhook] boutique paid confirmation email failed:",
          err,
        );
      }

      // Archive comptable (DB + R2 PDF si Stripe a généré une invoice)
      try {
        const cmd = await prisma.boutiqueCommande.findUnique({
          where: { id: bigId },
          select: { userId: true, restaurantId: true },
        });
        if (cmd?.userId) {
          await archiveBoutiqueOrder({
            userId: cmd.userId,
            restaurantId: cmd.restaurantId,
            commandeId: bigId,
            session,
          });
        }
      } catch (err) {
        console.error("[stripe.webhook] boutique archive failed:", err);
      }
    }
    return;
  }
}

/**
 * Handler `invoice.payment_succeeded` : renouvellement mensuel d'abonnement
 * Pro/Premium. Stripe envoie cet event à chaque cycle.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Récupère le restaurant via la subscription metadata.
  // `invoice.subscription` est déprécié dans Stripe SDK 22.x mais existe
  // encore au runtime on fait un cast défensif pour rester compatible.
  const invAny = invoice as unknown as {
    subscription?: string | { id?: string } | null;
  };
  const rawSub = invAny.subscription;
  const subId =
    typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
  if (!subId) {
    // Invoice one-shot (boutique / SMS) déjà archivée via checkout.session.completed
    return;
  }

  const stripe = getStripe();
  if (!stripe) return;

  let restaurantId: string | null = null;
  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    restaurantId =
      sub.metadata?.ruliz_restaurant_id ??
      (await findRestaurantBySubId(subId));
  } catch (err) {
    console.warn("[stripe.webhook] retrieve sub failed:", err);
    return;
  }
  if (!restaurantId) return;

  const restoBigId = BigInt(restaurantId);
  const resto = await prisma.restaurant.findUnique({
    where: { id: restoBigId },
    select: { userId: true, nom: true, plan: true },
  });
  if (!resto?.userId) return;

  await archiveInvoice({
    userId: resto.userId,
    restaurantId: restoBigId,
    type: "subscription",
    stripeInvoiceId: invoice.id,
    stripeCustomerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id ?? null,
    invoiceNumber: invoice.number ?? null,
    amountPaidCentimes: invoice.amount_paid ?? 0,
    amountDueCentimes: invoice.amount_due ?? 0,
    currency: invoice.currency ?? "eur",
    status: invoice.status === "paid" ? "paid" : "open",
    description:
      invoice.lines.data[0]?.description ??
      `Abonnement ${resto.plan} ${resto.nom}`,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    issuedAt: invoice.created ? new Date(invoice.created * 1000) : null,
    paidAt:
      "status_transitions" in invoice &&
      invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
    metadata: {
      subscriptionId: subId,
      plan: resto.plan,
      restoNom: resto.nom,
    },
  });
}

/** Archive SMS pack (invoice optionnelle si Stripe l'a générée). */
async function archiveSmsPurchase(opts: {
  userId: number;
  restaurantId: bigint;
  session: Stripe.Checkout.Session;
  packSize: number;
}) {
  const stripe = getStripe();
  let invoicePdf: string | null = null;
  let hostedUrl: string | null = null;
  let invoiceNumber: string | null = null;
  let stripeInvoiceId: string | null = null;

  // Expand l'invoice si Stripe l'a créée via invoice_creation
  if (stripe && opts.session.id) {
    try {
      const full = await stripe.checkout.sessions.retrieve(opts.session.id, {
        expand: ["invoice"],
      });
      if (full.invoice && typeof full.invoice !== "string") {
        invoicePdf = full.invoice.invoice_pdf ?? null;
        hostedUrl = full.invoice.hosted_invoice_url ?? null;
        invoiceNumber = full.invoice.number ?? null;
        stripeInvoiceId = full.invoice.id;
      }
    } catch (err) {
      console.warn("[archive-sms] retrieve session invoice failed:", err);
    }
  }

  await archiveInvoice({
    userId: opts.userId,
    restaurantId: opts.restaurantId,
    type: "sms",
    stripeInvoiceId,
    stripeSessionId: opts.session.id,
    stripePaymentIntentId:
      typeof opts.session.payment_intent === "string"
        ? opts.session.payment_intent
        : opts.session.payment_intent?.id ?? null,
    stripeCustomerId:
      typeof opts.session.customer === "string"
        ? opts.session.customer
        : opts.session.customer?.id ?? null,
    invoiceNumber,
    amountPaidCentimes: opts.session.amount_total ?? 0,
    currency: opts.session.currency ?? "eur",
    status: "paid",
    description: `Pack ${opts.packSize} SMS`,
    hostedInvoiceUrl: hostedUrl,
    invoicePdfUrl: invoicePdf,
    issuedAt: new Date(),
    paidAt: new Date(),
    metadata: { packSize: opts.packSize },
  });
}

/** Archive boutique commande (invoice optionnelle si Stripe l'a générée). */
async function archiveBoutiqueOrder(opts: {
  userId: number;
  restaurantId: bigint | null;
  commandeId: bigint;
  session: Stripe.Checkout.Session;
}) {
  const stripe = getStripe();
  let invoicePdf: string | null = null;
  let hostedUrl: string | null = null;
  let invoiceNumber: string | null = null;
  let stripeInvoiceId: string | null = null;

  if (stripe && opts.session.id) {
    try {
      const full = await stripe.checkout.sessions.retrieve(opts.session.id, {
        expand: ["invoice"],
      });
      if (full.invoice && typeof full.invoice !== "string") {
        invoicePdf = full.invoice.invoice_pdf ?? null;
        hostedUrl = full.invoice.hosted_invoice_url ?? null;
        invoiceNumber = full.invoice.number ?? null;
        stripeInvoiceId = full.invoice.id;
      }
    } catch (err) {
      console.warn("[archive-boutique] retrieve session invoice failed:", err);
    }
  }

  await archiveInvoice({
    userId: opts.userId,
    restaurantId: opts.restaurantId,
    type: "boutique",
    stripeInvoiceId,
    stripeSessionId: opts.session.id,
    stripePaymentIntentId:
      typeof opts.session.payment_intent === "string"
        ? opts.session.payment_intent
        : opts.session.payment_intent?.id ?? null,
    stripeCustomerId:
      typeof opts.session.customer === "string"
        ? opts.session.customer
        : opts.session.customer?.id ?? null,
    invoiceNumber,
    amountPaidCentimes: opts.session.amount_total ?? 0,
    currency: opts.session.currency ?? "eur",
    status: "paid",
    description: `Commande boutique #${opts.commandeId.toString()}`,
    hostedInvoiceUrl: hostedUrl,
    invoicePdfUrl: invoicePdf,
    issuedAt: new Date(),
    paidAt: new Date(),
    metadata: { commandeId: opts.commandeId.toString() },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const restaurantId =
    sub.metadata?.ruliz_restaurant_id ??
    (await findRestaurantBySubId(sub.id));
  if (!restaurantId) {
    console.warn("[stripe.webhook] no restaurant matched for sub", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price.id ?? null;
  const plan: Plan =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? "freemium"
      : await resolvePlanFromPriceId(priceId);

  const periodEnd =
    "current_period_end" in sub && typeof sub.current_period_end === "number"
      ? new Date(sub.current_period_end * 1000)
      : null;

  // Statut du restaurant :
  // - "actif" : sub active, trialing, ou past_due (encore dans la période de grâce)
  // - "suspendu" : unpaid (Stripe a abandonné après 3+ échecs paiement) ou
  //   incomplete_expired (premier paiement jamais réussi)
  // - "actif" par défaut sinon
  const newRestoStatut: "actif" | "suspendu" =
    sub.status === "unpaid" || sub.status === "incomplete_expired"
      ? "suspendu"
      : "actif";

  await prisma.restaurant.updateMany({
    where: { id: BigInt(restaurantId) },
    data: {
      plan,
      statut: newRestoStatut,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });

  if (newRestoStatut === "suspendu") {
    console.log(
      `[stripe.webhook] restaurant ${restaurantId} SUSPENDED (sub status: ${sub.status})`,
    );
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const restaurantId =
    sub.metadata?.ruliz_restaurant_id ??
    (await findRestaurantBySubId(sub.id));
  if (!restaurantId) return;

  // Subscription supprimée par Stripe (fin de cycle après cancellation, ou
  // après 3 paiements échoués) → on revient en freemium MAIS on garde le resto
  // en "actif" : il peut continuer à utiliser la version gratuite.
  // Si l'utilisateur veut suspendre complètement → admin le fait à la main.
  await prisma.restaurant.updateMany({
    where: { id: BigInt(restaurantId) },
    data: {
      plan: "freemium",
      stripeSubscriptionStatus: "canceled",
      stripeCurrentPeriodEnd: null,
    },
  });
  console.log(
    `[stripe.webhook] restaurant ${restaurantId} subscription deleted, downgraded to freemium`,
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Stripe a changé la forme de `Invoice.subscription` entre les versions d'API ;
  // on extrait l'id défensivement pour rester compatible.
  const raw = (invoice as unknown as { subscription?: unknown }).subscription;
  let subId: string | null = null;
  if (typeof raw === "string") subId = raw;
  else if (
    raw &&
    typeof raw === "object" &&
    "id" in raw &&
    typeof (raw as { id: unknown }).id === "string"
  ) {
    subId = (raw as { id: string }).id;
  }
  if (!subId) return;

  await prisma.restaurant.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { stripeSubscriptionStatus: "past_due" },
  });
}

async function findRestaurantBySubId(subId: string): Promise<string | null> {
  const r = await prisma.restaurant.findFirst({
    where: { stripeSubscriptionId: subId },
    select: { id: true },
  });
  return r ? r.id.toString() : null;
}
