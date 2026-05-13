"use server";

import { prisma } from "@/lib/db";

/**
 * Incrémente le compteur de clics d'un produit. Appelé depuis la carte
 * publique quand un client ouvre le modal détail d'un produit.
 *
 * Volontairement simple :
 *  - Pas de tracking IP / fingerprint (RGPD-friendly)
 *  - Pas de session (juste un counter)
 *  - Erreurs silencieuses (un échec de tracking ne doit pas casser l'UX)
 *  - Fire-and-forget côté client
 */
export async function trackProduitClick(produitId: string): Promise<void> {
  try {
    const big = BigInt(produitId);
    await prisma.produit.update({
      where: { id: big },
      data: { clicCount: { increment: 1 } },
    });
  } catch (err) {
    // Silent fail · on ne veut PAS casser l'UX si la DB est down ou si
    // l'ID est invalide. Juste log côté serveur.
    console.warn("[trackProduitClick] failed:", err);
  }
}
