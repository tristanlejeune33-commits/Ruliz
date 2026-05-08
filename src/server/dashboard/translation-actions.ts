"use server";

import { revalidatePath } from "next/cache";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { inngest } from "@/server/inngest/client";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Trigger a full menu re-translation in background via Inngest.
 * Used by the "Re-translate" button in the dashboard.
 */
export async function retranslateMenu(restaurantId: string): Promise<ActionResult> {
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  try {
    await inngest.send({
      name: "restaurant/menu.translate",
      data: { restaurantId: bigId.toString() },
    });
  } catch (e) {
    console.error("[retranslateMenu] inngest send failed:", e);
    return {
      ok: false,
      error: "Inngest n'est pas joignable. Vérifie INNGEST_EVENT_KEY et que l'app est bien sync sur app.inngest.com.",
    };
  }

  revalidatePath("/dashboard/menu");
  revalidatePath(`/carte/${bigId.toString()}`);
  return { ok: true };
}
