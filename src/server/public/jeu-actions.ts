"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { SUPPORTED_LANGS } from "@/lib/langs";
import { normalizeInternationalPhone } from "@/lib/brevo";

/** Domaines d'emails jetables/temporaires les plus courants → refusés. */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "yopmail.fr", "yopmail.net",
  "guerrillamail.com", "guerrillamail.info", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com",
  "tempmailo.com", "trashmail.com", "getnada.com", "nada.email",
  "throwawaymail.com", "maildrop.cc", "mailnesia.com", "dispostable.com",
  "fakeinbox.com", "jetable.org", "tempinbox.com", "mohmal.com",
  "emailondeck.com", "spam4.me", "mailcatch.com", "moakt.com", "tmail.ws",
  "discard.email", "mailsac.com", "burnermail.io", "tmpmail.org",
]);

/** Nombre max de participations par IP sur 24h (anti-abus depuis un réseau). */
const MAX_PER_IP_24H = 5;

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
  naissance: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date de naissance obligatoire (JJ/MM/AAAA)"),
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

  // === Anti-triche ===
  // IP du joueur — le plus fiable d'abord (cf-connecting-ip derrière Cloudflare).
  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-real-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const email = data.email.toLowerCase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 0a. VALIDITÉ du téléphone : doit être un vrai numéro (FR ou international).
  //     On le normalise (E.164, chiffres seuls) pour le stockage + la dédup.
  const phoneCheck = normalizeInternationalPhone(data.telephone);
  if (!phoneCheck.ok) {
    return {
      ok: false,
      error: "Numéro de téléphone invalide (ex : 06 12 34 56 78 ou +33 6 12 …).",
    };
  }
  const phone = phoneCheck.value; // chiffres E.164, ex: 33612345678

  // 0b. VALIDITÉ de l'email : format OK (zod) + on refuse les emails jetables.
  const emailDomain = email.split("@")[1] ?? "";
  if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
    return {
      ok: false,
      error:
        "Merci d'utiliser une adresse email permanente (les emails jetables ne sont pas acceptés).",
    };
  }

  // 1. Anti-bot : rafale max 5 participations / IP / 60s (bloque les scripts
  //    qui spamment l'action, sans gêner une tablée qui joue chacun son tour).
  if (redis && ip) {
    try {
      const key = `roulette:rl:${jeuBigId.toString()}:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 5) {
        return {
          ok: false,
          error: "Trop de tentatives. Patiente une minute puis réessaie.",
        };
      }
    } catch {
      // Redis indispo → on ne bloque pas (best-effort)
    }
  }

  // 2. Plafond : max MAX_PER_IP_24H participations par IP / jeu / 24h.
  //    ⚠️ En WiFi partagé (resto), plusieurs clients ont la même IP → ce
  //    plafond peut bloquer des joueurs légitimes au-delà du seuil. La dédup
  //    email + téléphone (numéro VALIDE) reste le garde-fou principal.
  if (ip) {
    const ipCount = await prisma.jeuParticipation.count({
      where: { jeuId: jeuBigId, ip, participatedAt: { gte: since } },
    });
    if (ipCount >= MAX_PER_IP_24H) {
      return {
        ok: false,
        error:
          "Trop de participations depuis ce réseau aujourd'hui. Réessaie demain.",
      };
    }
  }

  // 3. 1 participation par EMAIL / jeu / 24h.
  const dupEmail = await prisma.jeuParticipation.findFirst({
    where: { jeuId: jeuBigId, email, participatedAt: { gte: since } },
    select: { id: true },
  });
  if (dupEmail) {
    return { ok: false, error: "Vous avez déjà participé. Réessayez demain !" };
  }

  // 4. 1 participation par TÉLÉPHONE (chiffres seuls → insensible au format) /
  //    jeu / 24h. Un numéro VALIDE est bien plus dur à multiplier qu'un email.
  if (phone.length >= 5) {
    try {
      const dupPhone = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
        `SELECT id FROM "jeu_participations"
         WHERE jeu_id = $1
           AND regexp_replace(COALESCE(telephone, ''), '\\D', '', 'g') = $2
           AND participated_at >= $3
         LIMIT 1`,
        jeuBigId,
        phone,
        since,
      );
      if (dupPhone.length > 0) {
        return {
          ok: false,
          error: "Ce numéro a déjà participé. Réessayez demain !",
        };
      }
    } catch (err) {
      console.warn("[jeu] vérif téléphone échouée:", err);
    }
  }

  // Tirage du lot avec les probabilités
  type LotConfig = { label: string; probabilite: number; maxWins?: number };
  type ConfigShape = { lots?: LotConfig[] };
  const config = (jeu.configJson as unknown as ConfigShape | null) ?? null;
  const lots = config?.lots ?? [];

  // Stock PAR LOT = quantité RESTANTE stockée dans le lot (maxWins) :
  //   null/absent = illimité ; 0 = épuisé (exclu) ; N = N restants.
  // Le stock est décrémenté à chaque gain (cf. plus bas). On exclut du tirage
  // les lots épuisés ; si tout est épuisé → jeu terminé.
  const available = lots.filter((l) => l.maxWins == null || l.maxWins > 0);
  if (lots.length > 0 && available.length === 0) {
    return {
      ok: false,
      error:
        "Tous les lots ont déjà été gagnés, le jeu est terminé. Reviens bientôt !",
    };
  }

  const lotGagne = pickLot(available);

  await prisma.jeuParticipation.create({
    data: {
      jeuId: jeuBigId,
      prenom: data.prenom,
      nom: data.nom,
      naissance: data.naissance || null,
      telephone: phone,
      email,
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
        email,
        telephone: phone,
        prenom: data.prenom,
        nom: data.nom,
        anniversaire: frenchDateToDate(data.naissance),
        source: "jeu_roulette",
      },
    })
    .catch(() => {
      // BaseClient peut déjà avoir l'email on ignore l'erreur
    });

  // Décrémente le stock du lot gagné (s'il est fini) directement dans la config
  // du jeu → le nombre affiché côté resto baisse, et le lot disparaît à 0.
  const won = lotGagne ? lots.find((l) => l.label === lotGagne) : undefined;
  if (won && won.maxWins != null && won.maxWins > 0) {
    const newLots = lots.map((l) =>
      l === won ? { ...l, maxWins: (l.maxWins ?? 0) - 1 } : l,
    );
    try {
      await prisma.jeu.update({
        where: { id: jeuBigId },
        data: { configJson: { ...config, lots: newLots } as never },
      });
    } catch (err) {
      console.warn("[jeu] décrément stock échoué:", err);
    }
    // Purge des caches : carte publique (tag + Redis) + page resto.
    revalidateTag("public-menu");
    revalidatePath(`/dashboard/jeu`);
    if (redis) {
      const keys = SUPPORTED_LANGS.map(
        (l) => `carte:${jeu.restaurantId.toString()}:${l}`,
      );
      await redis.del(...keys).catch(() => null);
    }
  }

  return { ok: true, lotGagne };
}

/** Convertit "JJ/MM/AAAA" en Date (null si invalide). */
function frenchDateToDate(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
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
