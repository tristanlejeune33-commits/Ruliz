import "server-only";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

/**
 * Sync d'un produit boutique Ruliz vers Stripe (Product + Price).
 *
 * Stratégie :
 *   - 1er appel (stripeProductId null) → crée le Product + le Price
 *   - Appels suivants → update le Product (nom/description/image/active)
 *     et, si le prix a changé, archive l'ancien Price et crée un nouveau
 *     (Stripe ne permet pas de modifier un Price existant)
 *
 * Best-effort : si Stripe pas configuré OU API fail → no-op silencieux,
 * juste un console.warn. La création/update Ruliz n'est jamais bloquée
 * par un problème Stripe.
 *
 * Usage : appeler après chaque mutation de produit (create/update/delete).
 * Ne PAS bloquer la réponse — wrapper avec waitUntil() ou catch() pour
 * éviter de retarder l'UI.
 */

interface ProduitToSync {
  id: bigint;
  nom: string;
  description: string | null;
  prixCentimes: number;
  devise: string;
  imageUrl: string | null;
  statut: "brouillon" | "publie" | "archive";
  stripeProductId: string | null;
  stripePriceId: string | null;
}

export async function syncProduitToStripe(
  produit: ProduitToSync,
): Promise<{ stripeProductId: string; stripePriceId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const isActive = produit.statut === "publie";
  const productPayload = {
    name: produit.nom,
    description: produit.description ?? undefined,
    images: produit.imageUrl ? [produit.imageUrl] : undefined,
    active: isActive,
    metadata: {
      ruliz_boutique_produit_id: produit.id.toString(),
    },
  };

  try {
    let productId = produit.stripeProductId;
    let priceId = produit.stripePriceId;

    // === 1) PRODUCT ===
    if (!productId) {
      const created = await stripe.products.create(productPayload);
      productId = created.id;
    } else {
      try {
        await stripe.products.update(productId, productPayload);
      } catch (err) {
        // Si le Product Stripe a été supprimé manuellement → recrée
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes("no such product")
        ) {
          const created = await stripe.products.create(productPayload);
          productId = created.id;
          priceId = null; // force recréation du Price
        } else {
          throw err;
        }
      }
    }

    // === 2) PRICE ===
    // Vérifie si le Price existant correspond toujours au prix/devise voulu.
    // Sinon : archive l'ancien + crée un nouveau (Stripe ne permet pas
    // d'updater un Price existant, c'est immutable par design).
    let priceNeedsRecreate = !priceId;
    if (priceId) {
      try {
        const existing = await stripe.prices.retrieve(priceId);
        const sameAmount = existing.unit_amount === produit.prixCentimes;
        const sameCurrency =
          existing.currency.toUpperCase() === produit.devise.toUpperCase();
        if (!sameAmount || !sameCurrency) {
          priceNeedsRecreate = true;
        }
      } catch {
        priceNeedsRecreate = true;
      }
    }

    if (priceNeedsRecreate) {
      // Archive l'ancien Price si existant
      if (priceId) {
        try {
          await stripe.prices.update(priceId, { active: false });
        } catch {
          // ignore — peut-être déjà archivé / supprimé
        }
      }
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: produit.prixCentimes,
        currency: produit.devise.toLowerCase(),
        // Pas de `recurring` → one-shot (paiement unique)
        metadata: {
          ruliz_boutique_produit_id: produit.id.toString(),
        },
      });
      priceId = newPrice.id;

      // Définit ce nouveau price comme default_price du Product (pour qu'il
      // s'affiche correctement dans le dashboard Stripe)
      try {
        await stripe.products.update(productId, { default_price: priceId });
      } catch {
        // best-effort, pas critique
      }
    }

    return { stripeProductId: productId, stripePriceId: priceId! };
  } catch (err) {
    console.error("[stripe-sync] Erreur sync produit boutique:", err);
    return null;
  }
}

/**
 * Sync différé : appelé en best-effort après une mutation, met à jour la
 * DB avec les IDs Stripe retournés par sync.
 */
export async function syncProduitToStripeAndPersist(
  produitId: bigint,
): Promise<void> {
  const produit = await prisma.boutiqueProduit.findUnique({
    where: { id: produitId },
    select: {
      id: true,
      nom: true,
      description: true,
      prixCentimes: true,
      devise: true,
      imageUrl: true,
      statut: true,
      stripeProductId: true,
      stripePriceId: true,
    },
  });
  if (!produit) return;

  const result = await syncProduitToStripe(produit);
  if (result) {
    await prisma.boutiqueProduit.update({
      where: { id: produitId },
      data: {
        stripeProductId: result.stripeProductId,
        stripePriceId: result.stripePriceId,
      },
    });
  }
}

/**
 * Archive complète sur Stripe : product désactivé, price archivé.
 * Appelé quand on supprime un produit Ruliz (Stripe ne permet pas la
 * suppression réelle d'un Product s'il est référencé par un Price/Invoice).
 */
export async function archiveProduitOnStripe(produit: {
  stripeProductId: string | null;
  stripePriceId: string | null;
}): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  try {
    if (produit.stripePriceId) {
      await stripe.prices
        .update(produit.stripePriceId, { active: false })
        .catch(() => {});
    }
    if (produit.stripeProductId) {
      await stripe.products
        .update(produit.stripeProductId, { active: false })
        .catch(() => {});
    }
  } catch (err) {
    console.warn("[stripe-sync] Erreur archive produit:", err);
  }
}
