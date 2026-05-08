"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { isBrevoConfigured, normalizeFrenchPhone, sendSms } from "@/lib/brevo";
import { prisma } from "@/lib/db";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const blastSchema = z.object({
  restaurantId: z.string(),
  message: z.string().min(1).max(320),
  filterSource: z.enum(["all", "roulette", "manual"]).default("all"),
});

export async function sendSmsBlast(input: unknown): Promise<
  ActionResult<{ sent: number; failed: number; skipped: number }>
> {
  const parsed = blastSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(parsed.data.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  if (!isBrevoConfigured()) {
    return {
      ok: false,
      error: "Brevo n'est pas configuré. Renseigne BREVO_API_KEY dans l'env.",
    };
  }

  const where: Parameters<typeof prisma.baseClient.findMany>[0] = {
    where: {
      restaurantId: restoBigId,
      telephone: { not: null },
    },
  };
  if (parsed.data.filterSource !== "all" && where.where) {
    (where.where as { source?: string }).source = parsed.data.filterSource;
  }

  const recipients = await prisma.baseClient.findMany({
    ...where,
    select: { id: true, telephone: true, prenom: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of recipients) {
    if (!r.telephone) {
      skipped += 1;
      continue;
    }
    const normalized = normalizeFrenchPhone(r.telephone);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    const personalized = parsed.data.message.replace(
      /{{\s*prenom\s*}}/gi,
      r.prenom ?? "",
    );
    const res = await sendSms({ recipient: normalized, content: personalized });
    if (res.ok) sent += 1;
    else failed += 1;
  }

  revalidatePath("/dashboard/sms");

  return { ok: true, data: { sent, failed, skipped } };
}
