"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const lotSchema = z.object({
  label: z.string().min(1).max(100),
  probabilite: z.number().int().min(1).max(100),
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

const participateSchema = z.object({
  jeuId: z.string(),
  email: z.email(),
  prenom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
});

interface JeuConfig {
  cta?: string;
  lots: Array<{ label: string; probabilite: number }>;
  require_google_review?: boolean;
}

function pickWeightedLot(lots: JeuConfig["lots"]): JeuConfig["lots"][number] | null {
  if (lots.length === 0) return null;
  const total = lots.reduce((acc, l) => acc + l.probabilite, 0);
  let r = Math.random() * total;
  for (const lot of lots) {
    r -= lot.probabilite;
    if (r <= 0) return lot;
  }
  return lots[lots.length - 1] ?? null;
}

/**
 * Public endpoint : joue à la roulette, retourne le lot tiré + l'index pour
 * que le client puisse animer la rotation.
 */
export async function spinRoulette(input: unknown): Promise<
  ActionResult<{ lotLabel: string; lotIndex: number }>
> {
  const parsed = participateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const big = bigOrNull(parsed.data.jeuId);
  if (!big) return { ok: false, error: "Jeu invalide" };

  const jeu = await prisma.jeu.findUnique({
    where: { id: big },
    include: { restaurant: { select: { id: true } } },
  });
  if (!jeu || !jeu.actif) {
    return { ok: false, error: "Jeu indisponible." };
  }

  const config = jeu.configJson as unknown as JeuConfig | null;
  if (!config?.lots?.length) {
    return { ok: false, error: "Configuration de jeu invalide" };
  }

  const winning = pickWeightedLot(config.lots);
  if (!winning) return { ok: false, error: "Aucun lot disponible" };

  const lotIndex = config.lots.findIndex((l) => l === winning);

  // Persistence asynchrone (best-effort, ne bloque pas la réponse)
  await prisma.$transaction([
    prisma.jeuParticipation.create({
      data: {
        jeuId: big,
        email: parsed.data.email,
        prenom: parsed.data.prenom,
        telephone: parsed.data.telephone || null,
        lotGagne: winning.label,
      },
    }),
    prisma.baseClient.create({
      data: {
        restaurantId: jeu.restaurant.id,
        email: parsed.data.email,
        prenom: parsed.data.prenom,
        telephone: parsed.data.telephone || null,
        source: "roulette",
      },
    }),
  ]);

  return { ok: true, data: { lotLabel: winning.label, lotIndex } };
}
