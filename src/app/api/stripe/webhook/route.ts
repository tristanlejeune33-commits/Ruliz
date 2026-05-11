import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { priceIdToPlan, type Plan } from "@/lib/plans";

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
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        // Ignorer le reste
        break;
    }
  } catch (err) {
    console.error(`[stripe.webhook] handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: "Erreur de traitement" },
      { status: 500 },
    );
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

    await prisma.boutiqueCommande.updateMany({
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
    return;
  }
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
  const plan: Plan = (() => {
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      return "freemium";
    }
    return priceIdToPlan(priceId);
  })();

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
