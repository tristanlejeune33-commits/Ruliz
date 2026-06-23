"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/plan-gate";
import { popupsConflict } from "@/lib/popup-overlap";

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
  // Planning hebdo + horaire
  joursActifs: z.number().int().min(0).max(127).nullable(),
  heureDebut: z.string().max(5).nullable(),
  heureFin: z.string().max(5).nullable(),
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
  // Gating serveur : pop-ups = feature Pro+ (le lock UI seul est
  // contournable via appel direct à la server action)
  const gate = await assertFeature("popups");
  if (!gate.ok) return gate;

  const parsed = popupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const restoBigId = bigOrNull(data.restaurantId);
  if (!restoBigId) return { ok: false, error: "Restaurant invalide" };

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  // Garde anti-chevauchement : un seul pop-up peut être actif à un instant
  // donné. On refuse d'enregistrer un pop-up ACTIF dont la programmation
  // recoupe celle d'un autre pop-up actif du même resto.
  if (data.actif) {
    const selfId = bigOrNull(data.id);
    const others = await prisma.popup.findMany({
      where: {
        restaurantId: restoBigId,
        actif: true,
        ...(selfId ? { id: { not: selfId } } : {}),
      },
      select: {
        titre: true,
        dateDebut: true,
        dateFin: true,
        joursActifs: true,
        heureDebut: true,
        heureFin: true,
      } as never,
    });
    const candidate = {
      dateDebut: data.dateDebut,
      dateFin: data.dateFin,
      joursActifs: data.joursActifs,
      heureDebut: emptyToNull(data.heureDebut),
      heureFin: emptyToNull(data.heureFin),
    };
    const clash = (
      others as unknown as Array<{
        titre: string | null;
        dateDebut: Date | null;
        dateFin: Date | null;
        joursActifs: number | null;
        heureDebut: string | null;
        heureFin: string | null;
      }>
    ).find((o) =>
      popupsConflict(candidate, {
        dateDebut: o.dateDebut ? o.dateDebut.toISOString() : null,
        dateFin: o.dateFin ? o.dateFin.toISOString() : null,
        joursActifs: o.joursActifs,
        heureDebut: o.heureDebut,
        heureFin: o.heureFin,
      }),
    );
    if (clash) {
      return {
        ok: false,
        error: `Ce pop-up chevauche « ${clash.titre ?? "un autre pop-up"} » sur la même période. Un seul pop-up peut être actif à la fois : ajuste les dates, jours ou horaires (ou désactive l'autre).`,
      };
    }
  }

  const payload = {
    titre: data.titre,
    description: emptyToNull(data.description),
    imageUrl: emptyToNull(data.imageUrl),
    ctaLabel: emptyToNull(data.ctaLabel),
    ctaUrl: emptyToNull(data.ctaUrl),
    dateDebut: parseDateOrNull(data.dateDebut),
    dateFin: parseDateOrNull(data.dateFin),
    joursActifs:
      data.joursActifs && data.joursActifs > 0 ? data.joursActifs : null,
    heureDebut: emptyToNull(data.heureDebut),
    heureFin: emptyToNull(data.heureFin),
    actif: data.actif,
  };

  if (data.id) {
    const big = bigOrNull(data.id);
    if (!big) return { ok: false, error: "Identifiant invalide" };
    const owned = await prisma.popup.findFirst({
      where: { id: big, restaurantId: restoBigId },
    });
    if (!owned) return { ok: false, error: "Pop-up introuvable" };
    // Cast `data: payload as never` pour bypasser le typage Prisma local
    // qui pourrait ne pas avoir les nouveaux champs joursActifs/heureDebut/
    // heureFin (client pas régénéré → DB OK, mais types stale).
    await prisma.popup.update({
      where: { id: big },
      data: payload as never,
    });
    revalidatePath("/dashboard/popups");
    revalidatePath(`/carte/${restoBigId.toString()}`);
    return { ok: true, data: { id: big.toString() } };
  }

  const created = await prisma.popup.create({
    data: { restaurantId: restoBigId, ...payload } as never,
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
