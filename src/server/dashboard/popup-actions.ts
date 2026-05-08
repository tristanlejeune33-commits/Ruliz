"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const popupSchema = z.object({
  restaurantId: z.string(),
  id: z.string().nullable().optional(),
  titre: z.string().min(1).max(255),
  description: z.string().max(2000),
  imageUrl: z.string().max(500),
  ctaLabel: z.string().max(100),
  ctaUrl: z.string().max(500),
  dateDebut: z.string().nullable(),
  dateFin: z.string().nullable(),
  actif: z.boolean(),
});

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function emptyToNull(v: string | null | undefined) {
  return v && v.trim().length > 0 ? v : null;
}

function parseDateOrNull(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function upsertPopup(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = popupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const restoBigId = bigOrNull(data.restaurantId);
  if (!restoBigId) return { ok: false, error: "Restaurant invalide" };

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  const payload = {
    titre: data.titre,
    description: emptyToNull(data.description),
    imageUrl: emptyToNull(data.imageUrl),
    ctaLabel: emptyToNull(data.ctaLabel),
    ctaUrl: emptyToNull(data.ctaUrl),
    dateDebut: parseDateOrNull(data.dateDebut),
    dateFin: parseDateOrNull(data.dateFin),
    actif: data.actif,
  };

  if (data.id) {
    const big = bigOrNull(data.id);
    if (!big) return { ok: false, error: "Identifiant invalide" };
    const owned = await prisma.popup.findFirst({
      where: { id: big, restaurantId: restoBigId },
    });
    if (!owned) return { ok: false, error: "Pop-up introuvable" };
    await prisma.popup.update({ where: { id: big }, data: payload });
    revalidatePath("/dashboard/popups");
    revalidatePath(`/carte/${restoBigId.toString()}`);
    return { ok: true, data: { id: big.toString() } };
  }

  const created = await prisma.popup.create({
    data: { restaurantId: restoBigId, ...payload },
  });
  revalidatePath("/dashboard/popups");
  revalidatePath(`/carte/${restoBigId.toString()}`);
  return { ok: true, data: { id: created.id.toString() } };
}

export async function deletePopup(id: string): Promise<ActionResult> {
  const big = bigOrNull(id);
  if (!big) return { ok: false, error: "Identifiant invalide" };

  const popup = await prisma.popup.findUnique({
    where: { id: big },
    select: { restaurantId: true },
  });
  if (!popup) return { ok: false, error: "Introuvable" };

  const owned = await assertRestaurantOwner(popup.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.popup.delete({ where: { id: big } });
  revalidatePath("/dashboard/popups");
  revalidatePath(`/carte/${popup.restaurantId.toString()}`);
  return { ok: true };
}

export async function togglePopupActif(id: string): Promise<ActionResult> {
  const big = bigOrNull(id);
  if (!big) return { ok: false, error: "Identifiant invalide" };

  const popup = await prisma.popup.findUnique({
    where: { id: big },
    select: { restaurantId: true, actif: true },
  });
  if (!popup) return { ok: false, error: "Introuvable" };

  const owned = await assertRestaurantOwner(popup.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.popup.update({
    where: { id: big },
    data: { actif: !popup.actif },
  });
  revalidatePath("/dashboard/popups");
  revalidatePath(`/carte/${popup.restaurantId.toString()}`);
  return { ok: true };
}
