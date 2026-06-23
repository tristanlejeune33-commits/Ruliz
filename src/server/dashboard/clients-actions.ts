"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { normalizeInternationalPhone } from "@/lib/brevo";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ============================================================
// SCHEMAS
// ============================================================

const createClientSchema = z.object({
  restaurantId: z.string(),
  prenom: z.string().max(100).optional().or(z.literal("")),
  nom: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Email invalide").max(255).optional().or(z.literal("")),
  telephone: z.string().min(1, "Téléphone requis").max(30),
  anniversaire: z.string().optional().or(z.literal("")),
  optInSms: z.boolean().default(true),
});

const updateClientSchema = createClientSchema.extend({
  id: z.string(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Liste tous les clients d'un restaurant (source = manual + roulette).
 * Pour la page /dashboard/clients du restaurateur.
 */
export async function listClients(restaurantId: string): Promise<
  Array<{
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
    anniversaire: string | null;
    source: string | null;
    optInSms: boolean;
    createdAt: string;
  }>
> {
  await ensureRuntimeSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return [];
  }
  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return [];

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, prenom, nom, email, telephone,
            anniversaire::text AS "anniversaire",
            source, COALESCE(opt_in_sms, TRUE) AS "optInSms",
            created_at AS "createdAt"
     FROM base_clients
     WHERE restaurant_id = $1
     ORDER BY created_at DESC
     LIMIT 500`,
    bigId,
  )) as Array<{
    id: bigint;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
    anniversaire: string | null;
    source: string | null;
    optInSms: boolean;
    createdAt: Date;
  }>;

  return rows.map((r) => ({
    id: r.id.toString(),
    prenom: r.prenom,
    nom: r.nom,
    email: r.email,
    telephone: r.telephone,
    anniversaire: r.anniversaire,
    source: r.source,
    optInSms: r.optInSms,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Liste uniquement les clients ajoutés MANUELLEMENT par le restaurateur,
 * pour le multi-select de la campagne SMS en mode "manuel".
 */
export async function listManualClients(restaurantId: string): Promise<
  Array<{
    id: string;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
  }>
> {
  await ensureRuntimeSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return [];
  }
  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return [];

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, prenom, nom, telephone
     FROM base_clients
     WHERE restaurant_id = $1
       AND source = 'manual'
       AND telephone IS NOT NULL
       AND COALESCE(opt_in_sms, TRUE) = TRUE
     ORDER BY prenom ASC, nom ASC
     LIMIT 1000`,
    bigId,
  )) as Array<{
    id: bigint;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id.toString(),
    prenom: r.prenom,
    nom: r.nom,
    telephone: r.telephone,
  }));
}

// ============================================================
// MUTATIONS
// ============================================================

export async function createClient(input: unknown): Promise<ActionResult> {
  await ensureRuntimeSchema();
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  let bigId: bigint;
  try {
    bigId = BigInt(parsed.data.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  // Normalise le téléphone au format E.164
  const normalized = normalizeInternationalPhone(parsed.data.telephone);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  // Parse anniversaire si fourni (format ISO YYYY-MM-DD)
  let anniversaireDate: Date | null = null;
  if (parsed.data.anniversaire && parsed.data.anniversaire.trim()) {
    const d = new Date(parsed.data.anniversaire);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Date d'anniversaire invalide" };
    }
    anniversaireDate = d;
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO base_clients
         (restaurant_id, prenom, nom, email, telephone, anniversaire, source, opt_in_sms)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7)`,
      bigId,
      parsed.data.prenom?.trim() || null,
      parsed.data.nom?.trim() || null,
      parsed.data.email?.trim() || null,
      normalized.value,
      anniversaireDate,
      parsed.data.optInSms,
    );
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/sms");
    return { ok: true };
  } catch (err) {
    console.error("[clients] createClient failed:", err);
    return { ok: false, error: "Création échouée" };
  }
}

export async function updateClient(input: unknown): Promise<ActionResult> {
  await ensureRuntimeSchema();
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  let bigId: bigint;
  let clientId: bigint;
  try {
    bigId = BigInt(parsed.data.restaurantId);
    clientId = BigInt(parsed.data.id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  // Vérifie que le client appartient bien à ce resto
  const existing = (await prisma.$queryRawUnsafe(
    `SELECT id FROM base_clients WHERE id = $1 AND restaurant_id = $2`,
    clientId,
    bigId,
  )) as Array<{ id: bigint }>;
  if (existing.length === 0) {
    return { ok: false, error: "Client introuvable" };
  }

  const normalized = normalizeInternationalPhone(parsed.data.telephone);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  let anniversaireDate: Date | null = null;
  if (parsed.data.anniversaire && parsed.data.anniversaire.trim()) {
    const d = new Date(parsed.data.anniversaire);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Date d'anniversaire invalide" };
    }
    anniversaireDate = d;
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE base_clients
       SET prenom = $2, nom = $3, email = $4, telephone = $5,
           anniversaire = $6, opt_in_sms = $7
       WHERE id = $1`,
      clientId,
      parsed.data.prenom?.trim() || null,
      parsed.data.nom?.trim() || null,
      parsed.data.email?.trim() || null,
      normalized.value,
      anniversaireDate,
      parsed.data.optInSms,
    );
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/sms");
    return { ok: true };
  } catch (err) {
    console.error("[clients] updateClient failed:", err);
    return { ok: false, error: "Mise à jour échouée" };
  }
}

// ============================================================
// IMPORT EN MASSE (CSV)
// ============================================================

const importRowSchema = z.object({
  prenom: z.string().max(100).optional(),
  nom: z.string().max(100).optional(),
  telephone: z.string().max(40),
  email: z.string().max(255).optional(),
  anniversaire: z.string().max(40).optional(),
  optInSms: z.boolean().optional(),
});

const importClientsSchema = z.object({
  restaurantId: z.string(),
  rows: z.array(importRowSchema).min(1).max(2000),
});

/**
 * Importe une liste de clients (parsée depuis un CSV côté client).
 *
 * - Téléphone obligatoire et normalisé en E.164 (les lignes invalides sont
 *   ignorées et rapportées).
 * - Email invalide → vidé (on n'échoue pas la ligne pour autant).
 * - Dédoublonnage sur le téléphone (numéros déjà présents = ignorés).
 * - Source = "manual" (comme un ajout à la main → exploitable en SMS).
 */
export async function importClients(
  input: unknown,
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  await ensureRuntimeSchema();
  const parsed = importClientsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Fichier invalide (vérifie le format du modèle).",
    };
  }

  let bigId: bigint;
  try {
    bigId = BigInt(parsed.data.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  // Téléphones déjà en base → dédoublonnage.
  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT telephone FROM base_clients WHERE restaurant_id = $1 AND telephone IS NOT NULL`,
    bigId,
  )) as Array<{ telephone: string | null }>;
  const seen = new Set(existingRows.map((r) => r.telephone).filter(Boolean));

  const toInsert: Array<{
    restaurantId: bigint;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string;
    anniversaire: Date | null;
    source: string;
    optInSms: boolean;
  }> = [];
  const errors: string[] = [];
  let skipped = 0;

  parsed.data.rows.forEach((row, i) => {
    const ligne = i + 2; // +1 (index→1-based) +1 (ligne d'en-tête CSV)
    const tel = (row.telephone ?? "").trim();
    if (!tel) {
      skipped += 1;
      if (errors.length < 10) errors.push(`Ligne ${ligne} : téléphone manquant.`);
      return;
    }
    const normalized = normalizeInternationalPhone(tel);
    if (!normalized.ok) {
      skipped += 1;
      if (errors.length < 10)
        errors.push(`Ligne ${ligne} : ${normalized.error} (« ${tel} »).`);
      return;
    }
    if (seen.has(normalized.value)) {
      skipped += 1; // déjà en base ou doublon dans le fichier
      return;
    }
    seen.add(normalized.value);

    // Email : on garde s'il est plausible, sinon on vide (sans bloquer).
    const emailRaw = (row.email ?? "").trim();
    const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw : null;

    // Anniversaire : accepte YYYY-MM-DD ou DD/MM/YYYY.
    let anniversaire: Date | null = null;
    const anniRaw = (row.anniversaire ?? "").trim();
    if (anniRaw) {
      const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(anniRaw);
      const iso = fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : anniRaw;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) anniversaire = d;
    }

    toInsert.push({
      restaurantId: bigId,
      prenom: (row.prenom ?? "").trim() || null,
      nom: (row.nom ?? "").trim() || null,
      email,
      telephone: normalized.value,
      anniversaire,
      source: "manual",
      optInSms: row.optInSms ?? true,
    });
  });

  if (toInsert.length === 0) {
    return {
      ok: false,
      error:
        errors.length > 0
          ? errors.join(" ")
          : "Aucun nouveau client à importer (tous déjà présents ou invalides).",
    };
  }

  try {
    await prisma.baseClient.createMany({ data: toInsert });
  } catch (err) {
    console.error("[clients] importClients failed:", err);
    return { ok: false, error: "Import échoué côté serveur." };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/sms");
  return {
    ok: true,
    data: { imported: toInsert.length, skipped, errors },
  };
}

export async function deleteClient(input: {
  restaurantId: string;
  id: string;
}): Promise<ActionResult> {
  let bigId: bigint;
  let clientId: bigint;
  try {
    bigId = BigInt(input.restaurantId);
    clientId = BigInt(input.id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.baseClient.deleteMany({
    where: { id: clientId, restaurantId: bigId },
  });

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/sms");
  return { ok: true };
}
