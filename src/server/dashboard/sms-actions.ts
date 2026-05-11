"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { isBrevoConfigured, normalizeFrenchPhone, sendSms } from "@/lib/brevo";
import { prisma } from "@/lib/db";
import { APP_URL, getStripe } from "@/lib/stripe";
import { getSmsPackById } from "./sms-packs";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// Configuration des packs SMS importée depuis ./sms-packs (fichier séparé
// car Next.js refuse l'export de constantes depuis un fichier "use server").

// ============================================================
// AUTO-ENSURE SCHEMA
// ============================================================
// Même pattern que onboarding : si la migration n'est pas appliquée,
// on crée les tables au premier appel. Idempotent (IF NOT EXISTS).

let schemaEnsured = false;
async function ensureSmsSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    // Colonnes additionnelles base_clients
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "base_clients"
        ADD COLUMN IF NOT EXISTS "nom" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "anniversaire" DATE,
        ADD COLUMN IF NOT EXISTS "opt_in_sms" BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_balance" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL UNIQUE,
        "balance" INTEGER NOT NULL DEFAULT 0,
        "total_acquired" INTEGER NOT NULL DEFAULT 0,
        "total_spent" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "idx_sms_balance_resto" ON "sms_balance"("restaurant_id");`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_credit_purchases" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "pack_size" INTEGER NOT NULL,
        "price_paid_centimes" INTEGER NOT NULL,
        "stripe_session_id" VARCHAR(255) UNIQUE,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "paid_at" TIMESTAMPTZ
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_messages" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "recipient" VARCHAR(20) NOT NULL,
        "content" TEXT NOT NULL,
        "segments" INTEGER NOT NULL DEFAULT 1,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "brevo_ref" VARCHAR(255),
        "campaign_id" BIGINT,
        "trigger_type" VARCHAR(50),
        "error_message" TEXT,
        "sent_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_campaigns" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message_template" TEXT NOT NULL,
        "target_filter" VARCHAR(100) NOT NULL DEFAULT 'all',
        "total_sent" INTEGER NOT NULL DEFAULT 0,
        "total_failed" INTEGER NOT NULL DEFAULT 0,
        "total_skipped" INTEGER NOT NULL DEFAULT 0,
        "tokens_spent" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "sent_at" TIMESTAMPTZ
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_automations" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "trigger_type" VARCHAR(50) NOT NULL,
        "message_template" TEXT NOT NULL,
        "days_offset" INTEGER NOT NULL DEFAULT 0,
        "send_hour" INTEGER NOT NULL DEFAULT 10,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn("[sms] ensureSmsSchema failed:", err);
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcule le nombre de segments d'un SMS.
 * GSM 7-bit : 160 chars par segment.
 * Si caractères Unicode (emoji, accents é è ê) : 70 chars par segment.
 * On reste pragmatique : detect Unicode → 70 ; sinon 160.
 */
function calcSegments(content: string): number {
  const hasUnicode = /[^\x00-\x7F]/.test(content);
  const limit = hasUnicode ? 70 : 160;
  if (content.length <= limit) return 1;
  // SMS concaténés : -7 chars par segment pour l'en-tête de concat
  const adjustedLimit = hasUnicode ? 67 : 153;
  return Math.ceil(content.length / adjustedLimit);
}

/**
 * Remplace les tags du template par les valeurs réelles du client.
 * Tags supportés : {prenom}, {nom}, {resto}.
 * Tags inconnus ou valeurs vides → remplacés par string vide.
 */
function applyTags(
  template: string,
  data: { prenom?: string | null; nom?: string | null; resto?: string | null },
): string {
  return template
    .replace(/\{prenom\}/gi, data.prenom?.trim() ?? "")
    .replace(/\{nom\}/gi, data.nom?.trim() ?? "")
    .replace(/\{resto\}/gi, data.resto?.trim() ?? "")
    .replace(/\s+/g, " ") // évite les doubles espaces si un tag est vide
    .trim();
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Récupère le solde SMS d'un restaurant (crée la ligne si absente).
 */
export async function getSmsBalance(
  restaurantId: string,
): Promise<{ balance: number; totalAcquired: number; totalSpent: number }> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { balance: 0, totalAcquired: 0, totalSpent: 0 };
  }

  const restaurant = await assertRestaurantOwner(bigId);
  if (!restaurant) return { balance: 0, totalAcquired: 0, totalSpent: 0 };

  try {
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT balance, total_acquired AS "totalAcquired", total_spent AS "totalSpent"
       FROM sms_balance WHERE restaurant_id = $1 LIMIT 1`,
      bigId,
    )) as Array<{ balance: number; totalAcquired: number; totalSpent: number }>;

    if (existing.length === 0) {
      // Crée la ligne si absente
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_balance (restaurant_id, balance, total_acquired, total_spent)
         VALUES ($1, 0, 0, 0)
         ON CONFLICT (restaurant_id) DO NOTHING`,
        bigId,
      );
      return { balance: 0, totalAcquired: 0, totalSpent: 0 };
    }
    return existing[0]!;
  } catch (err) {
    console.warn("[sms] getSmsBalance failed:", err);
    return { balance: 0, totalAcquired: 0, totalSpent: 0 };
  }
}

// ============================================================
// BLAST / CAMPAIGN
// ============================================================

const blastSchema = z.object({
  restaurantId: z.string(),
  title: z.string().max(255).optional(),
  message: z.string().min(1).max(640),
  filterSource: z.enum(["all", "roulette", "manual"]).default("all"),
});

/**
 * Envoie une campagne SMS à tous les clients qui matchent le filtre.
 * Pour chaque client :
 *   1. Vérifie opt_in_sms = true
 *   2. Normalise le téléphone
 *   3. Applique les tags ({prenom}, {nom}, {resto})
 *   4. Décrémente le solde de N segments
 *   5. Envoie via Brevo
 *   6. Log dans sms_messages
 *
 * Refuse l'envoi si le solde est insuffisant pour TOUS les destinataires.
 */
export async function sendSmsBlast(input: unknown): Promise<
  ActionResult<{
    sent: number;
    failed: number;
    skipped: number;
    tokensSpent: number;
  }>
> {
  await ensureSmsSchema();

  const parsed = blastSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
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
      error: "Service SMS temporairement indisponible. Réessaie dans quelques minutes.",
    };
  }

  // Récupère les destinataires (avec opt-in OK et téléphone non null)
  const where: Record<string, unknown> = {
    restaurantId: restoBigId,
    telephone: { not: null },
  };
  if (parsed.data.filterSource !== "all") {
    where.source = parsed.data.filterSource;
  }
  // Filtre opt-in (cast as never car schema potentiellement stale)
  (where as { optInSms?: boolean }).optInSms = true;

  // Note : on sélectionne `nom` via cast as never car le client Prisma local
  // peut être stale (lock Windows EPERM bloquant `prisma generate`).
  const selectPayload = {
    id: true,
    telephone: true,
    prenom: true,
    nom: true,
  };
  const recipients = (await prisma.baseClient.findMany({
    where: where as never,
    select: selectPayload as never,
  })) as unknown as Array<{
    id: bigint;
    telephone: string | null;
    prenom: string | null;
    nom?: string | null;
  }>;

  if (recipients.length === 0) {
    return {
      ok: false,
      error: "Aucun destinataire trouvé. Vérifie que tes clients ont bien laissé leur téléphone.",
    };
  }

  // Calcule le coût estimé (segments × destinataires)
  // On utilise le PIRE cas (template avec tag long, ex: "Jean-Christophe")
  // pour éviter de sous-estimer.
  const sampleContent = applyTags(parsed.data.message, {
    prenom: "Christophe",
    nom: "Dupont",
    resto: restaurant.nom ?? "Restaurant",
  });
  const segmentsPerSms = calcSegments(sampleContent);
  const estimatedTokens = segmentsPerSms * recipients.length;

  // Vérifie le solde
  const balance = await getSmsBalance(parsed.data.restaurantId);
  if (balance.balance < estimatedTokens) {
    return {
      ok: false,
      error: `Solde insuffisant : il te faut ${estimatedTokens} SMS et tu as ${balance.balance}. Achète un pack pour continuer.`,
    };
  }

  // Crée la campagne
  const campaign = (await prisma.$queryRawUnsafe(
    `INSERT INTO sms_campaigns
       (restaurant_id, title, message_template, target_filter, status)
     VALUES ($1, $2, $3, $4, 'sending')
     RETURNING id`,
    restoBigId,
    parsed.data.title ?? `Campagne ${new Date().toLocaleDateString("fr-FR")}`,
    parsed.data.message,
    parsed.data.filterSource,
  )) as Array<{ id: bigint }>;
  const campaignId = campaign[0]!.id;

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let tokensSpent = 0;

  for (const r of recipients) {
    if (!r.telephone) {
      skipped++;
      continue;
    }
    const normalized = normalizeFrenchPhone(r.telephone);
    if (!normalized) {
      skipped++;
      continue;
    }

    const personalized = applyTags(parsed.data.message, {
      prenom: r.prenom,
      nom: r.nom,
      resto: restaurant.nom,
    });
    const segments = calcSegments(personalized);

    // Vérifie solde restant à chaque envoi (sécurité contre les race conditions)
    const currentBalance = await getSmsBalance(parsed.data.restaurantId);
    if (currentBalance.balance < segments) {
      skipped++;
      continue;
    }

    const res = await sendSms({
      recipient: normalized,
      content: personalized,
    });

    if (res.ok) {
      sent++;
      tokensSpent += segments;
      // Décrément atomique du solde
      await prisma.$executeRawUnsafe(
        `UPDATE sms_balance
         SET balance = balance - $2, total_spent = total_spent + $2, updated_at = NOW()
         WHERE restaurant_id = $1`,
        restoBigId,
        segments,
      );
      // Log message
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_messages
           (restaurant_id, recipient, content, segments, status, brevo_ref, campaign_id)
         VALUES ($1, $2, $3, $4, 'sent', $5, $6)`,
        restoBigId,
        normalized,
        personalized,
        segments,
        res.reference ?? null,
        campaignId,
      );
    } else {
      failed++;
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_messages
           (restaurant_id, recipient, content, segments, status, error_message, campaign_id)
         VALUES ($1, $2, $3, $4, 'failed', $5, $6)`,
        restoBigId,
        normalized,
        personalized,
        segments,
        res.error.slice(0, 500),
        campaignId,
      );
    }
  }

  // Update finals de la campagne
  await prisma.$executeRawUnsafe(
    `UPDATE sms_campaigns
     SET total_sent = $2, total_failed = $3, total_skipped = $4,
         tokens_spent = $5, status = 'sent', sent_at = NOW()
     WHERE id = $1`,
    campaignId,
    sent,
    failed,
    skipped,
    tokensSpent,
  );

  revalidatePath("/dashboard/sms");

  return { ok: true, data: { sent, failed, skipped, tokensSpent } };
}

// ============================================================
// AUTOMATISATIONS
// ============================================================

const automationSchema = z.object({
  restaurantId: z.string(),
  triggerType: z.enum(["birthday", "post_roulette", "anniversary_signup"]),
  messageTemplate: z.string().min(1).max(640),
  daysOffset: z.number().int().min(-30).max(30).default(0),
  sendHour: z.number().int().min(0).max(23).default(10),
  active: z.boolean().default(true),
});

export async function createSmsAutomation(input: unknown): Promise<ActionResult> {
  await ensureSmsSchema();
  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(parsed.data.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  await prisma.$executeRawUnsafe(
    `INSERT INTO sms_automations
       (restaurant_id, trigger_type, message_template, days_offset, send_hour, active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    restoBigId,
    parsed.data.triggerType,
    parsed.data.messageTemplate,
    parsed.data.daysOffset,
    parsed.data.sendHour,
    parsed.data.active,
  );

  revalidatePath("/dashboard/sms");
  return { ok: true };
}

export async function toggleSmsAutomation(
  automationId: string,
  active: boolean,
): Promise<ActionResult> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(automationId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  // Vérifie propriété via restaurant
  const auto = (await prisma.$queryRawUnsafe(
    `SELECT restaurant_id AS "restaurantId" FROM sms_automations WHERE id = $1`,
    bigId,
  )) as Array<{ restaurantId: bigint }>;
  if (auto.length === 0) return { ok: false, error: "Introuvable" };
  const owned = await assertRestaurantOwner(auto[0]!.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.$executeRawUnsafe(
    `UPDATE sms_automations SET active = $2, updated_at = NOW() WHERE id = $1`,
    bigId,
    active,
  );

  revalidatePath("/dashboard/sms");
  return { ok: true };
}

export async function deleteSmsAutomation(
  automationId: string,
): Promise<ActionResult> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(automationId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const auto = (await prisma.$queryRawUnsafe(
    `SELECT restaurant_id AS "restaurantId" FROM sms_automations WHERE id = $1`,
    bigId,
  )) as Array<{ restaurantId: bigint }>;
  if (auto.length === 0) return { ok: false, error: "Introuvable" };
  const owned = await assertRestaurantOwner(auto[0]!.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.$executeRawUnsafe(
    `DELETE FROM sms_automations WHERE id = $1`,
    bigId,
  );

  revalidatePath("/dashboard/sms");
  return { ok: true };
}

export async function listSmsAutomations(
  restaurantId: string,
): Promise<
  Array<{
    id: string;
    triggerType: string;
    messageTemplate: string;
    daysOffset: number;
    sendHour: number;
    active: boolean;
  }>
> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return [];
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return [];

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, trigger_type AS "triggerType", message_template AS "messageTemplate",
            days_offset AS "daysOffset", send_hour AS "sendHour", active
     FROM sms_automations WHERE restaurant_id = $1 ORDER BY created_at DESC`,
    bigId,
  )) as Array<{
    id: bigint;
    triggerType: string;
    messageTemplate: string;
    daysOffset: number;
    sendHour: number;
    active: boolean;
  }>;
  return rows.map((r) => ({ ...r, id: r.id.toString() }));
}

// ============================================================
// PREVIEW / ESTIMATION
// ============================================================

/**
 * Estime le coût d'une campagne avant envoi (pour preview UI).
 * Retourne : nombre de destinataires + segments × destinataires = tokens estimés.
 */
export async function estimateSmsBlast(input: {
  restaurantId: string;
  message: string;
  filterSource: "all" | "roulette" | "manual";
}): Promise<{
  recipientCount: number;
  segmentsPerSms: number;
  estimatedTokens: number;
  balanceAfter: number;
  enough: boolean;
}> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(input.restaurantId);
  } catch {
    return {
      recipientCount: 0,
      segmentsPerSms: 1,
      estimatedTokens: 0,
      balanceAfter: 0,
      enough: false,
    };
  }

  const restaurant = await assertRestaurantOwner(bigId);
  if (!restaurant) {
    return {
      recipientCount: 0,
      segmentsPerSms: 1,
      estimatedTokens: 0,
      balanceAfter: 0,
      enough: false,
    };
  }

  const where: Record<string, unknown> = {
    restaurantId: bigId,
    telephone: { not: null },
  };
  if (input.filterSource !== "all") {
    where.source = input.filterSource;
  }
  (where as { optInSms?: boolean }).optInSms = true;

  const count = await prisma.baseClient.count({ where: where as never });

  const sample = input.message
    .replace(/\{prenom\}/gi, "Christophe")
    .replace(/\{nom\}/gi, "Dupont")
    .replace(/\{resto\}/gi, restaurant.nom ?? "Restaurant");
  const segments = calcSegments(sample);
  const tokens = segments * count;

  const balance = await getSmsBalance(input.restaurantId);
  return {
    recipientCount: count,
    segmentsPerSms: segments,
    estimatedTokens: tokens,
    balanceAfter: balance.balance - tokens,
    enough: balance.balance >= tokens,
  };
}

// ============================================================
// HISTORIQUE
// ============================================================

export async function listSmsCampaigns(
  restaurantId: string,
  limit: number = 20,
): Promise<
  Array<{
    id: string;
    title: string;
    messageTemplate: string;
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    tokensSpent: number;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }>
> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return [];
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return [];

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, title, message_template AS "messageTemplate",
            total_sent AS "totalSent", total_failed AS "totalFailed",
            total_skipped AS "totalSkipped", tokens_spent AS "tokensSpent",
            status, sent_at AS "sentAt", created_at AS "createdAt"
     FROM sms_campaigns
     WHERE restaurant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    bigId,
    limit,
  )) as Array<{
    id: bigint;
    title: string;
    messageTemplate: string;
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    tokensSpent: number;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
  }>;

  return rows.map((r) => ({
    ...r,
    id: r.id.toString(),
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ============================================================
// ACHAT DE PACK SMS (Stripe Checkout one-shot)
// ============================================================

/**
 * Crée une session Stripe Checkout pour l'achat d'un pack SMS.
 * Le webhook /api/stripe/webhook crédite le solde une fois le paiement OK.
 *
 * Retourne l'URL Stripe Checkout à laquelle rediriger l'utilisateur.
 */
export async function createSmsPackCheckout(input: {
  restaurantId: string;
  packId: string;
}): Promise<ActionResult<{ url: string }>> {
  await ensureSmsSchema();

  // Lit le pack depuis la DB (sms_pack_settings) ; respecte les prix custom
  // définis par l'admin via /admin/settings.
  const pack = await getSmsPackById(input.packId);
  if (!pack) return { ok: false, error: "Pack inconnu ou désactivé" };

  let bigId: bigint;
  try {
    bigId = BigInt(input.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const restaurant = await assertRestaurantOwner(bigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      error: "Service de paiement temporairement indisponible. Réessaie dans quelques minutes.",
    };
  }

  // 1. Crée un enregistrement pending en DB (idempotence + audit)
  const purchase = (await prisma.$queryRawUnsafe(
    `INSERT INTO sms_credit_purchases
       (restaurant_id, pack_size, price_paid_centimes, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    bigId,
    pack.size,
    pack.priceCentimes,
  )) as Array<{ id: bigint }>;
  const purchaseId = purchase[0]!.id;

  // 2. Crée la session Stripe Checkout
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pack.priceCentimes,
            product_data: {
              name: `${pack.label} — ${pack.size} SMS`,
              description: `Pack de ${pack.size} crédits SMS pour ${restaurant.nom}`,
            },
          },
        },
      ],
      metadata: {
        ruliz_sms_purchase_id: purchaseId.toString(),
        ruliz_sms_restaurant_id: input.restaurantId,
        ruliz_sms_pack_size: pack.size.toString(),
      },
      success_url: `${APP_URL}/dashboard/sms?purchase=success`,
      cancel_url: `${APP_URL}/dashboard/sms?purchase=cancel`,
    });

    if (!session.url) {
      return { ok: false, error: "URL de paiement manquante" };
    }
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    console.error("[sms] createSmsPackCheckout failed:", err);
    return {
      ok: false,
      error: "Création du paiement échouée. Réessaie ou contacte le support.",
    };
  }
}

/**
 * Historique des achats de packs SMS (pour l'admin et la page billing).
 */
export async function listSmsPurchases(
  restaurantId: string,
  limit: number = 50,
): Promise<
  Array<{
    id: string;
    packSize: number;
    pricePaidCentimes: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }>
> {
  await ensureSmsSchema();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return [];
  }

  const owned = await assertRestaurantOwner(bigId);
  if (!owned) return [];

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, pack_size AS "packSize", price_paid_centimes AS "pricePaidCentimes",
            status, created_at AS "createdAt", paid_at AS "paidAt"
     FROM sms_credit_purchases
     WHERE restaurant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    bigId,
    limit,
  )) as Array<{
    id: bigint;
    packSize: number;
    pricePaidCentimes: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }>;

  return rows.map((r) => ({
    ...r,
    id: r.id.toString(),
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
  }));
}
