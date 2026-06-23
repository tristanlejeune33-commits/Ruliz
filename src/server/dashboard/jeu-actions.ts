"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/plan-gate";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const lotSchema = z.object({
  label: z.string().min(1).max(100),
  probabilite: z.number().int().min(1).max(100),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  /** Stock de CE lot (0 / absent = illimité). Une fois atteint, ce lot n'est
   *  plus tirable (les autres continuent). */
  maxWins: z.number().int().min(0).max(1_000_000).optional(),
});

const configSchema = z.object({
  cta: z.string().min(1).max(255),
  lots: z.array(lotSchema).min(1).max(12),
  require_google_review: z.boolean(),
});

const upsertJeuSchema = z.object({
  restaurantId: z.string(),
  jeuId: z.string().nullable().optional(),
  nom: z.string().min(1).max(255),
  actif: z.boolean(),
  autoPopup: z.boolean().optional(),
  autoPopupDelaySec: z.number().int().min(0).max(60).optional(),
  /** ISO 8601 string OR null/empty = pas de borne */
  dateDebut: z.string().nullable().optional(),
  dateFin: z.string().nullable().optional(),
  config: configSchema,
});

function bigOrNull(value: string | null | undefined) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function upsertJeu(input: unknown): Promise<ActionResult<{ id: string }>> {
  // Gating serveur : la roulette est une feature Pro+. Le lock UI seul
  // est contournable via un appel direct à la server action.
  const gate = await assertFeature("rouletteGame");
  if (!gate.ok) return gate;

  const parsed = upsertJeuSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const {
    restaurantId,
    jeuId,
    nom,
    actif,
    config,
    autoPopup,
    autoPopupDelaySec,
    dateDebut,
    dateFin,
  } = parsed.data;

  // Parse les dates ISO en Date (ou null si vide)
  const parsedDateDebut = dateDebut ? new Date(dateDebut) : null;
  const parsedDateFin = dateFin ? new Date(dateFin) : null;
  if (parsedDateDebut && parsedDateFin && parsedDateDebut > parsedDateFin) {
    return {
      ok: false,
      error: "La date de début doit être avant la date de fin.",
    };
  }

  // Sanity : la somme des probabilités doit faire EXACTEMENT 100
  const total = config.lots.reduce((acc, l) => acc + l.probabilite, 0);
  if (total !== 100) {
    return {
      ok: false,
      error: `La somme des probabilités doit faire 100% (actuel : ${total}%). Utilise les boutons "Compléter à 100%" ou "Distribuer" pour ajuster automatiquement.`,
    };
  }

  const restoBigId = bigOrNull(restaurantId);
  if (!restoBigId) return { ok: false, error: "Restaurant invalide" };

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  if (jeuId) {
    const big = bigOrNull(jeuId);
    if (!big) return { ok: false, error: "Jeu invalide" };

    const owned = await prisma.jeu.findFirst({
      where: { id: big, restaurantId: restoBigId },
    });
    if (!owned) return { ok: false, error: "Jeu introuvable" };

    await prisma.jeu.update({
      where: { id: big },
      data: {
        nom,
        actif,
        autoPopup: autoPopup ?? false,
        autoPopupDelaySec: autoPopupDelaySec ?? 3,
        dateDebut: parsedDateDebut,
        dateFin: parsedDateFin,
        configJson: config as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/dashboard/jeu");
    revalidatePath(`/carte/${restoBigId.toString()}`);
    return { ok: true, data: { id: big.toString() } };
  }

  const created = await prisma.jeu.create({
    data: {
      restaurantId: restoBigId,
      nom,
      actif,
      autoPopup: autoPopup ?? false,
      autoPopupDelaySec: autoPopupDelaySec ?? 3,
      dateDebut: parsedDateDebut,
      dateFin: parsedDateFin,
      configJson: config as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/dashboard/jeu");
  revalidatePath(`/carte/${restoBigId.toString()}`);
  return { ok: true, data: { id: created.id.toString() } };
}

export async function deleteJeu(id: string): Promise<ActionResult> {
  const big = bigOrNull(id);
  if (!big) return { ok: false, error: "Identifiant invalide" };

  const jeu = await prisma.jeu.findUnique({
    where: { id: big },
    select: { restaurantId: true },
  });
  if (!jeu) return { ok: false, error: "Introuvable" };

  const owned = await assertRestaurantOwner(jeu.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.jeu.delete({ where: { id: big } });
  revalidatePath("/dashboard/jeu");
  revalidatePath(`/carte/${jeu.restaurantId.toString()}`);
  return { ok: true };
}

// NB : le tirage réel de la roulette publique vit dans
// `src/server/public/jeu-actions.ts` (submitParticipation), qui gère le stock
// par lot, l'anti-spam et la collecte des coordonnées. Il n'y a volontairement
// pas de second point d'entrée ici pour éviter toute divergence de logique.
