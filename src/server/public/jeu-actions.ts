"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Server action pour enregistrer une participation au jeu roulette.
 * Appelée depuis le modal-spinning de la carte publique (carte/[id]).
 *
 * Sécurité :
 *  - Vérifie que le jeu existe et qu'il est actif
 *  - Anti-spam : 1 participation max par email + jeu (24h)
 *  - Capture l'IP pour log (anti-spam manuel possible plus tard)
 *
 * Retour :
 *  - { ok: true, lotGagne: string | null } → la participation est enregistrée
 *  - { ok: false, error: string } → email déjà utilisé, jeu inactif, données invalides
 */

const ParticipationInput = z.object({
  jeuId: z.string(),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  naissance: z.string().max(20).optional(),
  telephone: z.string().min(5).max(20),
  email: z.email(),
  actionSociale: z.enum(["facebook", "instagram", "google_review"]),
});

export type ParticipationResult =
  | { ok: true; lotGagne: string | null }
  | { ok: false; error: string };

export async function submitParticipation(
  input: z.input<typeof ParticipationInput>,
): Promise<ParticipationResult> {
  const parsed = ParticipationInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  let jeuBigId: bigint;
  try {
    jeuBigId = BigInt(data.jeuId);
  } catch {
    return { ok: false, error: "Jeu invalide" };
  }

  const jeu = await prisma.jeu.findUnique({
    where: { id: jeuBigId },
    select: { id: true, actif: true, configJson: true, restaurantId: true },
  });
  if (!jeu || !jeu.actif) {
    return { ok: false, error: "Ce jeu n'est plus actif." };
  }

  // Anti-spam : 1 participation par email par jeu sur 24h
  const recent = await prisma.jeuParticipation.findFirst({
    where: {
      jeuId: jeuBigId,
      email: data.email.toLowerCase(),
      participatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) {
    return {
      ok: false,
      error: "Vous avez déjà participé. Réessayez demain !",
    };
  }

  // Tirage du lot avec les probabilités
  type LotConfig = { label: string; probabilite: number };
  type ConfigShape = { lots?: LotConfig[] };
  const config = (jeu.configJson as unknown as ConfigShape | null) ?? null;
  const lots = config?.lots ?? [];
  const lotGagne = pickLot(lots);

  // Récupère l'IP (best-effort, derrière un proxy/CDN)
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? null;

  await prisma.jeuParticipation.create({
    data: {
      jeuId: jeuBigId,
      prenom: data.prenom,
      nom: data.nom,
      naissance: data.naissance || null,
      telephone: data.telephone,
      email: data.email.toLowerCase(),
      actionSociale: data.actionSociale,
      ip,
      lotGagne,
    },
  });

  // On pousse aussi dans BaseClient si pas déjà présent (lead = participation)
  await prisma.baseClient
    .upsert({
      where: { id: BigInt(0) }, // jamais ce id, force un create
      update: {},
      create: {
        restaurantId: jeu.restaurantId,
        email: data.email.toLowerCase(),
        telephone: data.telephone,
        prenom: data.prenom,
        source: "jeu_roulette",
      },
    })
    .catch(() => {
      // BaseClient peut déjà avoir l'email — on ignore l'erreur
    });

  return { ok: true, lotGagne };
}

/** Pioche un lot selon les probabilités. Si total > 100, on normalise. */
function pickLot(
  lots: Array<{ label: string; probabilite: number }>,
): string | null {
  if (lots.length === 0) return null;
  const total = lots.reduce((acc, l) => acc + (l.probabilite || 0), 0);
  if (total <= 0) return null;
  const roll = Math.random() * total;
  let cursor = 0;
  for (const lot of lots) {
    cursor += lot.probabilite;
    if (roll < cursor) return lot.label;
  }
  return lots[lots.length - 1]?.label ?? null;
}
