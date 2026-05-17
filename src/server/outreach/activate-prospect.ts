import "server-only";
import { prisma } from "@/lib/db";
import { inngest } from "@/server/inngest/client";
import type { GeneratedCard } from "./generate-card";
import { sendActivationWelcomeEmail } from "./welcome-email";

/**
 * Active un prospect → crée le Restaurant + Categories + Produits à partir
 * de `cardJson`, lie au User fraîchement créé via signup.
 *
 * Côté UX :
 *   1. L'user signup avec ?prospect=token dans l'URL
 *   2. signupClient appelle activateProspect(userId, token)
 *   3. On crée Restaurant + arbre menu en 1 transaction
 *   4. On déclenche les traductions Inngest en background
 *   5. L'user arrive sur /dashboard avec sa carte déjà prête
 *
 * Idempotent : si prospect.status === "converted" déjà, on no-op.
 */
export async function activateProspect(opts: {
  userId: number;
  prospectToken: string;
}): Promise<{ ok: true; restaurantId: bigint } | { ok: false; error: string }> {
  const { userId, prospectToken } = opts;

  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { cardToken: prospectToken },
  });

  if (!prospect) {
    return { ok: false, error: "Prospect introuvable" };
  }

  if (prospect.status === "converted" && prospect.restaurantId) {
    // Déjà activé → on reattache éventuellement à un autre user (cas border)
    const existing = await prisma.restaurant.findUnique({
      where: { id: prospect.restaurantId },
      select: { id: true, userId: true },
    });
    if (existing && existing.userId === userId) {
      return { ok: true, restaurantId: existing.id };
    }
  }

  if (!prospect.cardJson) {
    return { ok: false, error: "Carte non générée pour ce prospect" };
  }

  const card = prospect.cardJson as unknown as GeneratedCard;
  if (!card.categories || card.categories.length === 0) {
    return { ok: false, error: "Carte vide" };
  }

  // ─── Création atomique Restaurant + Categories + Produits ───────────
  const result = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        userId,
        nom: prospect.nom,
        email: prospect.email,
        telephone: prospect.telephone,
        adresse: prospect.adresse,
        codePostal: prospect.codePostal,
        ville: prospect.ville,
        pays: "France",
        deviseDefault: "€",
        langueNative: "fr",
        couleurPrimaire: prospect.couleurDominante ?? "#26438A",
        siteWeb: prospect.siteWeb,
        logoUrl: prospect.logoUrl,
        banniereUrl: prospect.photoCover,
        plan: "freemium",
        statut: "actif",
      },
    });

    // Crée les catégories + produits dans l'ordre du cardJson.
    // NB : Categorie.titre + Produit.titre (pas "nom"), Produit n'a pas de
    // restaurantId (lien via categorieId).
    for (let ci = 0; ci < card.categories.length; ci++) {
      const cat = card.categories[ci];
      if (!cat) continue;

      const createdCat = await tx.categorie.create({
        data: {
          restaurantId: restaurant.id,
          titre: cat.nom,
          position: ci + 1,
          parentId: null,
        },
      });

      const produitData = (cat.produits ?? [])
        .map((p, pi) => {
          if (!p || !p.nom) return null;
          return {
            categorieId: createdCat.id,
            titre: p.nom,
            description: p.description ?? null,
            prix: p.prix > 0 ? p.prix : null,
            devise: "€",
            position: pi + 1,
          };
        })
        .filter(
          (p): p is NonNullable<typeof p> => p !== null,
        );

      if (produitData.length > 0) {
        await tx.produit.createMany({ data: produitData });
      }
    }

    return restaurant;
  });

  // ─── Update prospect → converted ────────────────────────────────────
  await prisma.prospectRestaurant.update({
    where: { id: prospect.id },
    data: {
      status: "converted",
      convertedAt: new Date(),
      restaurantId: result.id,
    },
  });

  await prisma.outreachEvent.create({
    data: {
      prospectId: prospect.id,
      type: "converted",
      metadata: { restaurantId: result.id.toString(), userId },
    },
  });

  // ─── Déclenche les traductions en background ────────────────────────
  try {
    await inngest.send({
      name: "restaurant/menu.translate",
      data: { restaurantId: result.id.toString() },
    });
  } catch (err) {
    console.warn("[activate-prospect] inngest send failed:", err);
  }

  // ─── Email de bienvenue post-activation (non bloquant) ──────────────
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { prenom: true, nom: true },
    });
    if (user) {
      await sendActivationWelcomeEmail({
        to: prospect.email,
        prenom: user.prenom ?? "bonjour",
        restaurantNom: prospect.nom,
        restaurantId: result.id,
      });
    }
  } catch (err) {
    console.warn("[activate-prospect] welcome email failed:", err);
  }

  return { ok: true, restaurantId: result.id };
}
