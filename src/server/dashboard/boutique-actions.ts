"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";
import { requireDashboard } from "@/lib/session";
import { clearCartAction } from "./boutique-cart-actions";
import {
  sendCommandeConfirmationToClient,
  sendCommandeNotificationToAdmin,
} from "@/server/boutique/emails";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function formatEuros(centimes: number, devise: string = "EUR"): string {
  return (centimes / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: devise,
  });
}

const itemSchema = z.object({
  produitId: z.string(),
  quantite: z.number().int().positive().max(1000),
});

const createCommandeSchema = z.object({
  items: z.array(itemSchema).min(1, "Panier vide"),
  restaurantId: z.string().optional().or(z.literal("")),
  livraisonNom: z.string().min(1, "Nom requis").max(255),
  livraisonAdresse: z.string().min(1, "Adresse requise").max(500),
  livraisonCodePostal: z.string().max(10),
  livraisonVille: z.string().max(100),
  livraisonPays: z.string().max(100).default("France"),
  livraisonTelephone: z.string().max(20).optional().or(z.literal("")),
  notesClient: z.string().max(2000).optional().or(z.literal("")),
});

/**
 * Crée une commande boutique multi-items pour le user agissant.
 *
 * - Snapshot du nom + prix à la création (cohérence post-modification du
 *   produit côté admin)
 * - Vérifie que TOUS les produits du panier existent et sont publiés
 * - Vide le panier après succès
 * - Envoie 2 emails : confirmation client + notif admin (si Resend configuré
 *   ET ADMIN_EMAIL set)
 */
export async function createBoutiqueCommande(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireDashboard();
  const parsed = createCommandeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  const acting = await getActingUserId();
  if (!acting) return { ok: false, error: "Session invalide" };

  // Récupère TOUS les produits demandés en 1 query
  const produitIds = data.items
    .map((i) => bigOrNull(i.produitId))
    .filter((x): x is bigint => x !== null);
  if (produitIds.length !== data.items.length) {
    return { ok: false, error: "Identifiant produit invalide" };
  }

  const produits = await prisma.boutiqueProduit.findMany({
    where: { id: { in: produitIds }, statut: "publie" },
  });

  // Validation : tous les produits doivent exister + être publiés
  if (produits.length !== data.items.length) {
    return {
      ok: false,
      error: "Certains produits ne sont plus disponibles. Recharge la page.",
    };
  }

  // Validation stock : pour chaque produit avec stockMax défini, vérifie
  // que la somme des items déjà commandés (non annulés) + qty demandée
  // ne dépasse pas le stockMax.
  const produitsAvecStock = produits.filter((p) => p.stockMax !== null);
  if (produitsAvecStock.length > 0) {
    const stockGroups = await prisma.boutiqueCommandeItem.groupBy({
      by: ["produitId"],
      where: {
        produitId: { in: produitsAvecStock.map((p) => p.id) },
        commande: { statut: { not: "annulee" } },
      },
      _sum: { quantite: true },
    });
    const usedMap = new Map<string, number>();
    for (const g of stockGroups) {
      usedMap.set(g.produitId.toString(), g._sum.quantite ?? 0);
    }
    for (const p of produitsAvecStock) {
      const used = usedMap.get(p.id.toString()) ?? 0;
      const remaining = Math.max(0, (p.stockMax ?? 0) - used);
      const wanted =
        data.items.find((i) => i.produitId === p.id.toString())?.quantite ?? 0;
      if (wanted > remaining) {
        return {
          ok: false,
          error:
            remaining === 0
              ? `« ${p.nom} » est en rupture de stock — retire-le du panier pour finaliser.`
              : `Stock insuffisant pour « ${p.nom} » : ${remaining} unité${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}, tu en demandes ${wanted}.`,
        };
      }
    }
  }

  // Restaurant rattaché — vérifie ownership si fourni
  let restaurantId: bigint | null = null;
  if (data.restaurantId) {
    const restoBig = bigOrNull(data.restaurantId);
    if (restoBig) {
      const owned = await prisma.restaurant.findFirst({
        where: { id: restoBig, userId: acting.actingUserId },
        select: { id: true },
      });
      if (owned) restaurantId = owned.id;
    }
  }

  // Construit les items avec snapshots
  const itemsData = data.items.map((i) => {
    const produit = produits.find((p) => p.id === BigInt(i.produitId))!;
    const totalCentimes = produit.prixCentimes * i.quantite;
    return {
      produitId: produit.id,
      produitNom: produit.nom,
      quantite: i.quantite,
      prixUnitaire: produit.prixCentimes,
      totalCentimes,
    };
  });

  const subtotalCentimes = itemsData.reduce((s, i) => s + i.totalCentimes, 0);
  const devise = produits[0]?.devise ?? "EUR";

  // Calcule les frais de port selon la config admin (0 si désactivé ou si
  // sous-total >= seuil "livraison offerte"). Le montant est snapshoté sur
  // la commande pour cohérence (ne change pas si l'admin modifie le tarif
  // après la création).
  const { calcShippingCentimes } = await import(
    "@/server/admin/boutique/shipping-actions"
  );
  const shippingCentimes = await calcShippingCentimes(subtotalCentimes);
  const totalCentimes = subtotalCentimes + shippingCentimes;

  const created = await prisma.boutiqueCommande.create({
    data: {
      userId: acting.actingUserId,
      restaurantId,
      totalCentimes,
      devise,
      livraisonNom: data.livraisonNom,
      livraisonAdresse: data.livraisonAdresse,
      livraisonCodePostal: data.livraisonCodePostal || null,
      livraisonVille: data.livraisonVille || null,
      livraisonPays: data.livraisonPays || "France",
      livraisonTelephone: data.livraisonTelephone || null,
      notesClient: data.notesClient || null,
      statut: "en_attente",
      items: {
        create: itemsData,
      },
    } as never,
  });

  // shipping_centimes ajouté en post-create via SQL brut car le client
  // Prisma local n'a pas régénéré le champ (lock Windows EPERM bloque
  // prisma generate). Idempotent : update no-op si la colonne n'existe pas.
  if (shippingCentimes > 0) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE boutique_commandes SET shipping_centimes = $1 WHERE id = $2`,
        shippingCentimes,
        created.id,
      );
    } catch (err) {
      console.warn("[boutique] persist shipping_centimes failed:", err);
    }
  }

  // Vide le panier
  await clearCartAction().catch((e) =>
    console.warn("[boutique] clearCart failed:", e),
  );

  // Récupère l'email du client pour les emails
  const clientUser = await prisma.user
    .findUnique({
      where: { id: acting.actingUserId },
      select: { email: true, prenom: true, nom: true },
    })
    .catch(() => null);

  // Envoie les emails (best-effort, ne bloque pas la commande si fail)
  if (clientUser?.email) {
    const livraisonAdresseHtml = [
      data.livraisonNom,
      data.livraisonAdresse,
      [data.livraisonCodePostal, data.livraisonVille].filter(Boolean).join(" "),
      data.livraisonPays,
      data.livraisonTelephone ? `Tél : ${data.livraisonTelephone}` : null,
    ]
      .filter(Boolean)
      .join("<br/>");

    const emailData = {
      commandeId: created.id.toString(),
      clientNom:
        [clientUser.prenom, clientUser.nom].filter(Boolean).join(" ") ||
        clientUser.email,
      clientEmail: clientUser.email,
      totalEuros: formatEuros(totalCentimes, devise),
      items: itemsData.map((i) => ({
        nom: i.produitNom,
        quantite: i.quantite,
        totalEuros: formatEuros(i.totalCentimes, devise),
      })),
      livraisonAdresseHtml,
      notesClient: data.notesClient || null,
    };

    // Confirmation client
    sendCommandeConfirmationToClient(emailData).catch((e) =>
      console.warn("[boutique] mail client failed:", e),
    );

    // Notif admin (si ADMIN_EMAIL défini)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      sendCommandeNotificationToAdmin({ ...emailData, adminEmail }).catch(
        (e) => console.warn("[boutique] mail admin failed:", e),
      );
    }
  }

  revalidatePath("/dashboard/boutique/commandes");
  revalidatePath("/admin/boutique/commandes");
  return { ok: true, data: { id: created.id.toString() } };
}
