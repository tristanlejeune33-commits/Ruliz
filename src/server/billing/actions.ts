"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/plans";
import { requireDashboard } from "@/lib/session";
import { APP_URL, TRIAL_PERIOD_DAYS, getStripe, isStripeConfigured } from "@/lib/stripe";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Get-or-create Stripe customer for the logged-in domain user.
 */
async function ensureStripeCustomer(): Promise<
  | { ok: true; customerId: string }
  | { ok: false; error: string }
> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe non configuré" };

  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) return { ok: false, error: "Compte introuvable" };

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      stripeCustomerId: true,
    },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  if (user.stripeCustomerId) {
    return { ok: true, customerId: user.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: [user.prenom, user.nom].filter(Boolean).join(" ") || undefined,
    metadata: { ruliz_user_id: user.id.toString() },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return { ok: true, customerId: customer.id };
}

const checkoutSchema = z.object({
  plan: z.enum(["pro", "premium"]),
  restaurantId: z.string(),
});

/**
 * Crée une session Stripe Checkout et renvoie l'URL.
 */
export async function createCheckoutSession(
  input: unknown,
): Promise<ActionResult<{ url: string }>> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Le paiement Stripe n'est pas encore configuré sur cet environnement.",
    };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };
  const { plan, restaurantId } = parsed.data;

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  const priceId = PLANS[plan as Plan].stripePriceIdMonthly;
  if (!priceId) {
    return {
      ok: false,
      error: `STRIPE_${plan.toUpperCase()}_PRICE_ID manquant dans l'env`,
    };
  }

  const customerResult = await ensureStripeCustomer();
  if (!customerResult.ok) return customerResult;

  const stripe = getStripe()!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerResult.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan === "pro" ? TRIAL_PERIOD_DAYS : undefined,
      metadata: {
        ruliz_restaurant_id: restoBigId.toString(),
        ruliz_plan: plan,
      },
    },
    metadata: {
      ruliz_restaurant_id: restoBigId.toString(),
      ruliz_plan: plan,
    },
    success_url: `${APP_URL}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/dashboard/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
  });

  if (!session.url) return { ok: false, error: "Stripe n'a pas retourné d'URL" };
  return { ok: true, data: { url: session.url } };
}

/**
 * Crée une session Customer Portal pour gérer son abonnement.
 */
export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe non configuré" };
  }

  const customerResult = await ensureStripeCustomer();
  if (!customerResult.ok) return customerResult;

  const stripe = getStripe()!;
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerResult.customerId,
    return_url: `${APP_URL}/dashboard/billing`,
  });

  return { ok: true, data: { url: portal.url } };
}

/**
 * Force-refresh des données d'abonnement depuis Stripe (utilisé après un retour
 * de Checkout en cas de webhook lent / pas encore reçu).
 */
export async function syncRestaurantSubscription(
  restaurantId: string,
): Promise<ActionResult> {
  if (!isStripeConfigured()) return { ok: false, error: "Stripe non configuré" };

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  if (!restaurant.stripeSubscriptionId) {
    return { ok: true };
  }

  const stripe = getStripe()!;
  const sub = await stripe.subscriptions.retrieve(restaurant.stripeSubscriptionId);

  const priceId = sub.items.data[0]?.price.id ?? null;
  const plan = priceId
    ? priceId === process.env.STRIPE_PRO_PRICE_ID
      ? "pro"
      : priceId === process.env.STRIPE_PREMIUM_PRICE_ID
        ? "premium"
        : "freemium"
    : "freemium";

  const periodEnd =
    "current_period_end" in sub && typeof sub.current_period_end === "number"
      ? new Date(sub.current_period_end * 1000)
      : null;

  await prisma.restaurant.update({
    where: { id: restoBigId },
    data: {
      plan,
      stripePriceId: priceId,
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });

  revalidatePath("/dashboard/billing");
  return { ok: true };
}
