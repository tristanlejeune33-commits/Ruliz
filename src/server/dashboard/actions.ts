"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  assertRestaurantOwner,
  setActiveRestaurantCookie,
} from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { canCreateRestaurant } from "@/lib/restaurant-limits";
import { requireDashboard } from "@/lib/session";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------- Active restaurant ----------------

export async function setActiveRestaurant(id: string): Promise<ActionResult> {
  let bigId: bigint;
  try {
    bigId = BigInt(id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const restaurant = await assertRestaurantOwner(bigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  await setActiveRestaurantCookie(bigId);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------- Restaurant edit ----------------

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const optHex = z
  .string()
  .regex(HEX_COLOR, "Format hexa #RRGGBB")
  .optional()
  .or(z.literal(""));

const restaurantSchema = z.object({
  id: z.string(),
  nom: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100).optional().or(z.literal("")),
  deviseDefault: z.string().max(5).optional().or(z.literal("")),
  langueNative: z.enum(["fr", "en", "es", "de", "it", "pt", "zh"]).optional(),
  // Horaires customisés
  lunchStart: z.string().max(5).optional(),
  lunchEnd: z.string().max(5).optional(),
  dinnerStart: z.string().max(5).optional(),
  dinnerEnd: z.string().max(5).optional(),
  happyHourStart: z.string().max(5).optional(),
  happyHourEnd: z.string().max(5).optional(),
  // Theme
  theme: z.enum(["light", "dark"]).optional(),
  fontStyle: z.enum(["modern", "editorial", "elegant"]).optional(),
  // Colors
  couleurPrimaire: optHex,
  couleurSecondaire: optHex,
  couleurFond: optHex,
  couleurTexteTitre: optHex,
  couleurCategorie: optHex,
  // Social
  facebookUrl: z.string().max(500).optional().or(z.literal("")),
  instagramUrl: z.string().max(500).optional().or(z.literal("")),
  tiktokUrl: z.string().max(500).optional().or(z.literal("")),
  siteWeb: z.string().max(500).optional().or(z.literal("")),
  googleReviewUrl: z.string().max(500).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  banniereUrl: z.string().max(500).optional().or(z.literal("")),
});

export async function updateRestaurant(input: unknown): Promise<ActionResult> {
  const parsed = restaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  let bigId: bigint;
  try {
    bigId = BigInt(data.id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  const empty = (v: string | undefined) => (v && v.trim().length > 0 ? v : null);

  // === ÉTAPE 1 : assure que les colonnes horaires existent en DB ===
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "lunch_start"      VARCHAR(5) DEFAULT '11:30',
        ADD COLUMN IF NOT EXISTS "lunch_end"        VARCHAR(5) DEFAULT '15:00',
        ADD COLUMN IF NOT EXISTS "dinner_start"     VARCHAR(5) DEFAULT '18:30',
        ADD COLUMN IF NOT EXISTS "dinner_end"       VARCHAR(5) DEFAULT '23:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_start" VARCHAR(5) DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_end"   VARCHAR(5) DEFAULT '19:00';
    `);
  } catch (err) {
    console.warn(
      "[updateRestaurant] ensure horaires columns failed (continuing):",
      err,
    );
  }

  // === ÉTAPE 2 : sauvegarde EXPLICITE des horaires en raw SQL ===
  // Avant le Prisma update général. Garantit que les horaires sont écrites
  // en DB peu importe ce qui plante après (cache Prisma client, etc.).
  const lunchStart = data.lunchStart || "11:30";
  const lunchEnd = data.lunchEnd || "15:00";
  const dinnerStart = data.dinnerStart || "18:30";
  const dinnerEnd = data.dinnerEnd || "23:00";
  const happyHourStart = data.happyHourStart || "18:00";
  const happyHourEnd = data.happyHourEnd || "19:00";
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "restaurants" SET
         "lunch_start" = $2, "lunch_end" = $3,
         "dinner_start" = $4, "dinner_end" = $5,
         "happy_hour_start" = $6, "happy_hour_end" = $7
       WHERE "id" = $1`,
      bigId,
      lunchStart,
      lunchEnd,
      dinnerStart,
      dinnerEnd,
      happyHourStart,
      happyHourEnd,
    );
    console.log(
      `[updateRestaurant] horaires raw SQL OK for resto ${bigId.toString()}`,
      { lunchStart, lunchEnd, dinnerStart, dinnerEnd, happyHourStart, happyHourEnd },
    );
  } catch (err) {
    console.error(
      "[updateRestaurant] horaires raw SQL FAILED:",
      err instanceof Error ? err.message : err,
    );
    return {
      ok: false,
      error:
        "Impossible de sauvegarder les horaires. Une migration DB a peut-être échoué — contacte le support.",
    };
  }

  // Tente d'abord l'update Prisma classique (avec tous les champs).
  // Si ça plante (P2022 column does not exist sur une colonne tardive),
  // on retombe sur un raw SQL qui n'utilise que les colonnes essentielles.
  try {
    await prisma.restaurant.update({
      where: { id: bigId },
      data: {
        nom: data.nom,
        description: empty(data.description),
        email: empty(data.email),
        telephone: empty(data.telephone),
        adresse: empty(data.adresse),
        codePostal: empty(data.codePostal),
        ville: empty(data.ville),
        pays: empty(data.pays),
        deviseDefault: empty(data.deviseDefault) ?? "€",
        langueNative: data.langueNative ?? "fr",
        lunchStart: data.lunchStart || "11:30",
        lunchEnd: data.lunchEnd || "15:00",
        dinnerStart: data.dinnerStart || "18:30",
        dinnerEnd: data.dinnerEnd || "23:00",
        happyHourStart: data.happyHourStart || "18:00",
        happyHourEnd: data.happyHourEnd || "19:00",
        theme: data.theme ?? "light",
        fontStyle: data.fontStyle ?? "editorial",
        couleurPrimaire: empty(data.couleurPrimaire),
        couleurSecondaire: empty(data.couleurSecondaire),
        couleurFond: empty(data.couleurFond),
        couleurTexteTitre: empty(data.couleurTexteTitre),
        couleurCategorie: empty(data.couleurCategorie),
        facebookUrl: empty(data.facebookUrl),
        instagramUrl: empty(data.instagramUrl),
        tiktokUrl: empty(data.tiktokUrl),
        siteWeb: empty(data.siteWeb),
        googleReviewUrl: empty(data.googleReviewUrl),
        logoUrl: empty(data.logoUrl),
        banniereUrl: empty(data.banniereUrl),
      },
    });
  } catch (err) {
    console.error(
      "[updateRestaurant] Prisma update FAILED, falling back to raw SQL:",
      err,
    );
    // Fallback raw SQL : update colonne par colonne, ne bloque pas sur
    // une colonne manquante (chaque update est isolé). Permet de save les
    // horaires même si une autre colonne récente plante.
    const updates: Array<[string, string | null]> = [
      ["nom", data.nom],
      ["description", empty(data.description)],
      ["email", empty(data.email)],
      ["telephone", empty(data.telephone)],
      ["adresse", empty(data.adresse)],
      ["code_postal", empty(data.codePostal)],
      ["ville", empty(data.ville)],
      ["pays", empty(data.pays)],
      ["devise_default", empty(data.deviseDefault) ?? "€"],
      ["langue_native", data.langueNative ?? "fr"],
      ["lunch_start", data.lunchStart || "11:30"],
      ["lunch_end", data.lunchEnd || "15:00"],
      ["dinner_start", data.dinnerStart || "18:30"],
      ["dinner_end", data.dinnerEnd || "23:00"],
      ["happy_hour_start", data.happyHourStart || "18:00"],
      ["happy_hour_end", data.happyHourEnd || "19:00"],
      ["theme", data.theme ?? "light"],
      ["font_style", data.fontStyle ?? "editorial"],
      ["couleur_primaire", empty(data.couleurPrimaire)],
      ["couleur_secondaire", empty(data.couleurSecondaire)],
      ["couleur_fond", empty(data.couleurFond)],
      ["couleur_texte_titre", empty(data.couleurTexteTitre)],
      ["couleur_categorie", empty(data.couleurCategorie)],
      ["facebook_url", empty(data.facebookUrl)],
      ["instagram_url", empty(data.instagramUrl)],
      ["tiktok_url", empty(data.tiktokUrl)],
      ["site_web", empty(data.siteWeb)],
      ["google_review_url", empty(data.googleReviewUrl)],
      ["logo_url", empty(data.logoUrl)],
      ["banniere_url", empty(data.banniereUrl)],
    ];
    let failedCount = 0;
    for (const [col, val] of updates) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "restaurants" SET "${col}" = $1 WHERE "id" = $2`,
          val,
          bigId,
        );
      } catch (e) {
        failedCount++;
        console.warn(
          `[updateRestaurant] raw SQL update failed for column "${col}":`,
          e instanceof Error ? e.message : e,
        );
      }
    }
    if (failedCount === updates.length) {
      return {
        ok: false,
        error: "Erreur de sauvegarde côté serveur. Réessaie dans 30s.",
      };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/restaurant");
  revalidatePath(`/carte/${bigId.toString()}`);
  return { ok: true };
}

// ---------------- Create first restaurant (onboarding) ----------------

const createRestaurantSchema = z.object({
  nom: z.string().min(1).max(255),
  ville: z.string().max(100).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  telephone: z.string().max(20).optional().or(z.literal("")),
});

export async function createFirstRestaurant(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: {
      userId: true,
      user: { select: { pays: true, langueNative: true } },
    },
  });
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable." };
  }

  const limit = await canCreateRestaurant(authUser.userId);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Ton plan ${limit.plan} est limité à ${limit.max} restaurant${limit.max && limit.max > 1 ? "s" : ""}. Passe Pro pour en ajouter d'autres.`,
    };
  }

  const empty = (v: string | undefined) => (v && v.trim().length > 0 ? v : null);

  // === Cadeau de bienvenue : 14 jours de Premium offerts ===
  // On vérifie que c'est bien le PREMIER restaurant de l'utilisateur.
  // Si c'est le N-ième (canCreateRestaurant a déjà validé qu'il est Pro+),
  // pas de cadeau supplémentaire.
  const existingCount = await prisma.restaurant.count({
    where: { userId: authUser.userId },
  });
  const isFirstRestaurant = existingCount === 0;

  const WELCOME_TRIAL_DAYS = 14;
  const trialExpiresAt = isFirstRestaurant
    ? new Date(Date.now() + WELCOME_TRIAL_DAYS * 24 * 3600 * 1000)
    : null;

  // Pré-remplit le pays et la langue native depuis le profil utilisateur
  // (renseignés au signup via le picker de pays).
  //
  // Garde-fou : on tente d'abord avec `planOffertExpiresAt` (cadeau 14j
  // Premium). Si la colonne n'existe pas (migration pas encore appliquée),
  // on retombe sur une création basique pour ne pas bloquer l'onboarding.
  // Cas typique : Railway redéploye le code AVANT que prisma migrate deploy
  // ait tourné → P2022 sur le 1er INSERT → user bloqué.
  const baseData: Prisma.RestaurantUncheckedCreateInput = {
    userId: authUser.userId,
    nom: parsed.data.nom,
    ville: empty(parsed.data.ville),
    email: empty(parsed.data.email),
    telephone: empty(parsed.data.telephone),
    pays: authUser.user?.pays ?? "France",
    langueNative: authUser.user?.langueNative ?? "fr",
    plan: isFirstRestaurant ? "premium" : "freemium",
    statut: "actif",
  };

  let restaurant;
  try {
    restaurant = await prisma.restaurant.create({
      data: {
        ...baseData,
        ...(trialExpiresAt
          ? ({ planOffertExpiresAt: trialExpiresAt } as never)
          : {}),
      },
    });
  } catch (err) {
    console.warn(
      "[onboarding] create resto with planOffertExpiresAt failed, retrying without:",
      err,
    );
    restaurant = await prisma.restaurant.create({ data: baseData });
    // Post-create : on tente d'écrire planOffertExpiresAt en SQL brut au cas
    // où la colonne existerait mais le client Prisma serait stale.
    if (trialExpiresAt) {
      await prisma
        .$executeRawUnsafe(
          `UPDATE restaurants SET plan_offert_expires_at = $1 WHERE id = $2`,
          trialExpiresAt,
          restaurant.id,
        )
        .catch((e) =>
          console.warn("[onboarding] persist plan_offert_expires_at failed:", e),
        );
    }
  }

  // Set as active restaurant cookie
  await setActiveRestaurantCookie(restaurant.id);

  revalidatePath("/dashboard");
  return { ok: true, data: { id: restaurant.id.toString() } };
}
