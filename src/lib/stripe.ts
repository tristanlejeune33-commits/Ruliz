import "server-only";
import Stripe from "stripe";
import { getAppUrl } from "./url";

let cached: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key, {
      // Pin la version d'API pour que les events webhook restent stables.
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return cached;
}

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
}

export const TRIAL_PERIOD_DAYS = 14;

export const APP_URL = getAppUrl();

/**
 * Récupère le Customer Stripe d'un user, le crée si absent.
 * Indispensable pour générer les factures PDF avec le nom du client.
 *
 * @param userId - ID interne Ruliz (int)
 * @returns customer.id Stripe ou null si Stripe n'est pas configuré
 */
export async function getOrCreateStripeCustomer(
  userId: number,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  // Import dynamique pour éviter cycle deps lib/db ↔ lib/stripe
  const { prisma } = await import("./db");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      prenom: true,
      nom: true,
      stripeCustomerId: true,
    },
  });
  if (!user) return null;

  // Déjà un customer ? On le réutilise.
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Créer le customer Stripe
  try {
    const fullName =
      [user.prenom, user.nom].filter(Boolean).join(" ").trim() || user.email;
    const customer = await stripe.customers.create({
      email: user.email,
      name: fullName,
      metadata: {
        ruliz_user_id: userId.toString(),
      },
    });

    // Persiste l'ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  } catch (err) {
    console.error("[stripe.getOrCreateStripeCustomer] failed:", err);
    return null;
  }
}
