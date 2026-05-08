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
  const restaurantId = session.metadata?.ruliz_restaurant_id;
  if (!restaurantId || !session.subscription) return;

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  // The subscription updated event will follow with full data ; we just bind here.
  await prisma.restaurant.updateMany({
    where: { id: BigInt(restaurantId) },
    data: { stripeSubscriptionId: subId },
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

  await prisma.restaurant.updateMany({
    where: { id: BigInt(restaurantId) },
    data: {
      plan,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const restaurantId =
    sub.metadata?.ruliz_restaurant_id ??
    (await findRestaurantBySubId(sub.id));
  if (!restaurantId) return;

  await prisma.restaurant.updateMany({
    where: { id: BigInt(restaurantId) },
    data: {
      plan: "freemium",
      stripeSubscriptionStatus: "canceled",
      stripeCurrentPeriodEnd: null,
    },
  });
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
