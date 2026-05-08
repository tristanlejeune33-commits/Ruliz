import "server-only";
import Stripe from "stripe";

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

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
