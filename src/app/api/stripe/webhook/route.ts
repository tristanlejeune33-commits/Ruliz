import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { priceIdToPlan, type Plan } from "@/lib/plans";
import {
  sendSmsPackConfirmation,
  sendBoutiquePaidConfirmation,
} from "@/server/sms/emails";

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
  // On vérifie en DB qu'on ne l'a pas déjà traité — sinon on renvoie 200
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
    // — perdre l'idempotence est moins grave que de manquer un webhook.
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
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        // Ignorer le reste
        break;
    }
  } catch (err) {
    console.error(`[stripe.webhook] handler error for ${event.type}:`, err);
    // On NE marque PAS comme traité si le handler a échoué — Stripe va
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
    }
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
