"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getActingUserId } from "@/lib/impersonation";
import { requireDashboard } from "@/lib/session";
import { getAppUrl } from "@/lib/url";

export type CheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Crée une Stripe Checkout Session pour une commande boutique.
 *
 * Flow :
 *   1. User clique "Payer en ligne" sur la fiche commande
 *   2. Cette action récupère la commande + ses items
 *   3. Crée une Checkout Session avec line_items basés sur les
 *      `stripePriceId` synchronisés (fallback price_data dynamique si pas
 *      de priceId synchro)
 *   4. Retourne l'URL Stripe Checkout pour redirection client
 *   5. Le webhook met à jour `paidAt + statut + stripePaymentIntentId`
 *      quand checkout.session.completed arrive
 *
 * Le user doit être propriétaire de la commande (vérification ownership).
 *
 * Idempotent : si la commande a déjà une `stripeCheckoutSessionId`
 * non-expirée, on retourne l'URL existante au lieu d'en créer une nouvelle.
 */
export async function createBoutiqueCheckoutSession(
  commandeId: string,
): Promise<CheckoutResult> {
  await requireDashboard();
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe n'est pas configuré sur cette instance." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe indisponible." };
  }

  const acting = await getActingUserId();
  if (!acting) return { ok: false, error: "Session invalide" };

  let bigId: bigint;
  try {
    bigId = BigInt(commandeId);
  } catch {
    return { ok: false, error: "Identifiant commande invalide" };
  }

  const commande = await prisma.boutiqueCommande.findFirst({
    where: { id: bigId, userId: acting.actingUserId },
    include: {
      items: {
        include: {
          produit: {
            select: {
              id: true,
              nom: true,
              imageUrl: true,
              stripePriceId: true,
              prixCentimes: true,
              devise: true,
            },
          },
        },
      },
      user: { select: { email: true, stripeCustomerId: true } },
    },
  });

  if (!commande) return { ok: false, error: "Commande introuvable" };
  if (commande.paidAt) {
    return { ok: false, error: "Cette commande est déjà payée." };
  }
  if (commande.statut === "annulee") {
    return { ok: false, error: "Cette commande a été annulée." };
  }

  // Idempotence : si une session existe déjà → on essaye de la réutiliser
  if (commande.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        commande.stripeCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url) {
        return { ok: true, checkoutUrl: existing.url };
      }
    } catch {
      // Session expirée ou supprimée → on crée une nouvelle
    }
  }

  // Construit les line_items : préfère le priceId synchronisé, fallback
  // sur price_data dynamique pour les produits non encore synchronisés
  // (compatibilité avec les anciens produits ou si Stripe vient d'être configuré).
  const lineItems: Array<{
    price?: string;
    price_data?: {
      currency: string;
      product_data: { name: string; images?: string[]; metadata?: Record<string, string> };
      unit_amount: number;
    };
    quantity: number;
  }> = commande.items.map((item) => {
    if (item.produit.stripePriceId) {
      return {
        price: item.produit.stripePriceId,
        quantity: item.quantite,
      };
    }
    return {
      price_data: {
        currency: item.produit.devise.toLowerCase(),
        product_data: {
          name: item.produit.nom,
          ...(item.produit.imageUrl ? { images: [item.produit.imageUrl] } : {}),
          metadata: {
            ruliz_boutique_produit_id: item.produit.id.toString(),
          },
        },
        unit_amount: item.produit.prixCentimes,
      },
      quantity: item.quantite,
    };
  });

  // Ajoute une ligne "Frais de port" si la commande en a (snapshot au moment
  // de la création). On lit shipping_centimes via SQL brut car le client
  // Prisma peut ne pas avoir le champ régénéré.
  const shippingRows = (await prisma.$queryRawUnsafe(
    `SELECT shipping_centimes AS "shippingCentimes" FROM boutique_commandes WHERE id = $1`,
    bigId,
  ).catch(() => [])) as Array<{ shippingCentimes: number }>;
  const shippingCentimes = shippingRows[0]?.shippingCentimes ?? 0;
  if (shippingCentimes > 0) {
    const devise = commande.items[0]?.produit.devise ?? "EUR";
    lineItems.push({
      price_data: {
        currency: devise.toLowerCase(),
        product_data: {
          name: "Frais de port",
          metadata: { ruliz_shipping: "true" },
        },
        unit_amount: shippingCentimes,
      },
      quantity: 1,
    });
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer: commande.user.stripeCustomerId ?? undefined,
    customer_email: commande.user.stripeCustomerId
      ? undefined
      : commande.user.email,
    success_url: `${appUrl}/dashboard/boutique/commandes/${commande.id.toString()}?checkout=success`,
    cancel_url: `${appUrl}/dashboard/boutique/commandes/${commande.id.toString()}?checkout=cancel`,
    // Génère automatiquement une facture PDF téléchargeable côté Stripe.
    // Le restaurateur retrouvera le PDF dans Paramètres > Mes commandes & factures.
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Commande boutique Ruliz #${commande.id.toString()}`,
        metadata: {
          ruliz_boutique_commande_id: commande.id.toString(),
        },
        footer: "Ruliz SaaS de menus digitaux pour restaurants.",
      },
    },
    payment_intent_data: {
      // Métadonnées pour le webhook : permet de retrouver la commande Ruliz
      // depuis le PaymentIntent quand checkout.session.completed arrive.
      metadata: {
        ruliz_boutique_commande_id: commande.id.toString(),
      },
    },
    metadata: {
      ruliz_boutique_commande_id: commande.id.toString(),
    },
    // Snapshot des coordonnées de livraison déjà collectées au moment de la
    // commande Stripe Checkout ne re-demande pas l'adresse au client.
    locale: "fr",
  });

  // Persiste l'ID de session pour idempotence + tracking webhook
  await prisma.boutiqueCommande.update({
    where: { id: bigId },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) {
    return { ok: false, error: "Stripe n'a pas retourné d'URL de paiement" };
  }

  revalidatePath(`/dashboard/boutique/commandes/${commande.id.toString()}`);
  return { ok: true, checkoutUrl: session.url };
}
