import "server-only";
import { prisma } from "./db";

/**
 * Auto-ensure des colonnes/tables critiques au runtime.
 *
 * Pourquoi ? Quand on ajoute une colonne via une migration Prisma, il y a
 * un risque que :
 *   1. Le code soit déployé AVANT que `prisma migrate deploy` ne tourne sur Railway
 *   2. Le client Prisma régénéré utilise la nouvelle colonne dans ses SELECT
 *   3. La DB ne l'a pas encore → P2022 column does not exist → tout crash
 *
 * Solution : à chaque démarrage du process Node, on s'assure que les
 * colonnes/tables critiques existent via `ALTER TABLE IF NOT EXISTS`.
 * Idempotent, ~1ms au 1er call, no-op ensuite (cached via flag module-level).
 *
 * Appelé dans les Server Components/queries qui sélectionnent ces tables.
 */

let runtimeSchemaEnsured = false;

export async function ensureRuntimeSchema(): Promise<void> {
  if (runtimeSchemaEnsured) return;

  try {
    // === restaurants : colonnes ajoutées tardivement ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "sms_sender" VARCHAR(11);
    `);

    // === base_clients : champs SMS marketing ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "base_clients"
        ADD COLUMN IF NOT EXISTS "nom" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "anniversaire" DATE,
        ADD COLUMN IF NOT EXISTS "opt_in_sms" BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // === users : champs onboarding + i18n ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "onboarding_step" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "onboarding_skipped" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "onboarding_started_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "onboarding_self_scanned" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "country_code" VARCHAR(2) DEFAULT 'FR',
        ADD COLUMN IF NOT EXISTS "langue_native" VARCHAR(2) DEFAULT 'fr';
    `);

    // === restaurants : plan offert (cadeau bienvenue 14j Premium + admin) ===
    // Bloque le signup d'un nouveau compte si la colonne manque, car
    // createFirstRestaurant insère planOffertExpiresAt sur le 1er resto.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "plan_offert_expires_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "plan_offert_by_user_id" INTEGER;
    `);

    // === Horaires de service (presets créneaux catégories) ===
    // Lunch / Dinner / Happy Hour · utilisés dans /dashboard/restaurant pour
    // pré-configurer les créneaux que les catégories peuvent réutiliser.
    // Sans ces colonnes, updateRestaurant plante silencieusement → l'auto-save
    // ne persiste rien et le user revoit ses anciennes valeurs au refresh.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "lunch_start"      VARCHAR(5) DEFAULT '11:30',
        ADD COLUMN IF NOT EXISTS "lunch_end"        VARCHAR(5) DEFAULT '15:00',
        ADD COLUMN IF NOT EXISTS "dinner_start"     VARCHAR(5) DEFAULT '18:30',
        ADD COLUMN IF NOT EXISTS "dinner_end"       VARCHAR(5) DEFAULT '23:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_start" VARCHAR(5) DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_end"   VARCHAR(5) DEFAULT '19:00';
    `);

    // === Tables SMS marketing ===
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

    // Colonnes ajoutées par migration 20260513090000_sms_campaign_scheduling
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "sms_campaigns"
        ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "target_client_ids" JSONB,
        ADD COLUMN IF NOT EXISTS "sender_name" VARCHAR(11);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_sms_campaign_scheduled"
        ON "sms_campaigns" ("status", "scheduled_at");
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

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_pack_settings" (
        "pack_id" VARCHAR(20) PRIMARY KEY,
        "size" INTEGER NOT NULL,
        "price_centimes" INTEGER NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "badge" VARCHAR(50),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // === Boutique : frais de port (config globale, 1 seule ligne id=1) ===
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "boutique_shipping_settings" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "fee_centimes" INTEGER NOT NULL DEFAULT 590,
        "free_threshold_centimes" INTEGER NOT NULL DEFAULT 0,
        "label" VARCHAR(100) NOT NULL DEFAULT 'Frais de port France métropolitaine',
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ("id" = 1)
      );
    `);
    // Seed la ligne par défaut si vide
    await prisma.$executeRawUnsafe(`
      INSERT INTO "boutique_shipping_settings" (id, fee_centimes, free_threshold_centimes, label, active)
      VALUES (1, 590, 0, 'Frais de port France métropolitaine', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ajout colonne frais_port_centimes sur boutique_commandes (snapshot au moment de la création)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "boutique_commandes"
        ADD COLUMN IF NOT EXISTS "shipping_centimes" INTEGER NOT NULL DEFAULT 0;
    `);

    // === Boutique : grammage produit (g) · pour calcul frais de port par poids ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "boutique_produits"
        ADD COLUMN IF NOT EXISTS "weight_grams" INTEGER NOT NULL DEFAULT 0;
    `);

    // === Stripe : table d'idempotence des webhooks ===
    // Stripe peut renvoyer le MÊME event plusieurs fois (retry réseau, replay).
    // Sans déduplication, on risque double crédit SMS, double upgrade de plan,
    // etc. Cette table garde la trace des event.id déjà traités.
    // TTL informel : on peut purger > 30 jours en cron plus tard.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "stripe_processed_events" (
        "event_id" VARCHAR(255) PRIMARY KEY,
        "event_type" VARCHAR(100) NOT NULL,
        "processed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_stripe_processed_events_at"
        ON "stripe_processed_events" ("processed_at" DESC);
    `);

    // === Boutique : tiers Colissimo (paliers tarifaires par tranche de poids) ===
    // Chaque ligne = un palier "jusqu'à max_grams → fee_centimes".
    // Le calcul prend le 1er tier dont max_grams ≥ poids_total_panier.
    // Si poids_total > tous les max_grams → on prend le dernier tier (le plus lourd).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "boutique_shipping_tiers" (
        "id" BIGSERIAL PRIMARY KEY,
        "max_grams" INTEGER NOT NULL,
        "fee_centimes" INTEGER NOT NULL,
        "label" VARCHAR(100) NOT NULL DEFAULT '',
        "position" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_boutique_shipping_tiers_max"
        ON "boutique_shipping_tiers" ("max_grams");
    `);
    // Seed des tiers Colissimo France métropolitaine si la table est vide.
    // === Archive locale des factures (obligation comptable 10 ans) ===
    // Snapshot de chaque facture émise (abo / SMS / boutique). Garantit une
    // trace locale même si Stripe a un souci, audit comptable rapide via SQL,
    // backup des URLs PDF Stripe + key R2 si on télécharge le PDF.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "invoices_archive" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "restaurant_id" BIGINT,
        "type" VARCHAR(20) NOT NULL,
        "stripe_invoice_id" VARCHAR(255),
        "stripe_session_id" VARCHAR(255),
        "stripe_payment_intent_id" VARCHAR(255),
        "stripe_customer_id" VARCHAR(255),
        "invoice_number" VARCHAR(50),
        "amount_paid_centimes" INTEGER NOT NULL DEFAULT 0,
        "amount_due_centimes" INTEGER NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
        "status" VARCHAR(20) NOT NULL DEFAULT 'paid',
        "description" TEXT,
        "hosted_invoice_url" TEXT,
        "invoice_pdf_url" TEXT,
        "r2_pdf_key" TEXT,
        "issued_at" TIMESTAMPTZ,
        "paid_at" TIMESTAMPTZ,
        "metadata_json" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_archive_stripe_invoice"
        ON "invoices_archive" ("stripe_invoice_id")
        WHERE "stripe_invoice_id" IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_archive_stripe_session"
        ON "invoices_archive" ("stripe_session_id")
        WHERE "stripe_session_id" IS NOT NULL;
      CREATE INDEX IF NOT EXISTS "idx_invoices_archive_user"
        ON "invoices_archive" ("user_id", "paid_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_invoices_archive_type"
        ON "invoices_archive" ("type", "paid_at" DESC);
    `);

    // === Tarifs officiels Colissimo France métropolitaine avec livraison
    // à domicile, applicables au 01/04/2026 (cf. cahier tarifaire La Poste
    // particuliers). Reflète exactement la grille 9 paliers de l'opérateur.
    // L'admin peut modifier ensuite via /admin/boutique → Frais de port.
    await prisma.$executeRawUnsafe(`
      INSERT INTO "boutique_shipping_tiers" (max_grams, fee_centimes, label, position)
      SELECT * FROM (VALUES
        (250,    549, 'Jusqu''à 250 g',     1),
        (500,    759, 'Jusqu''à 500 g',     2),
        (750,    929, 'Jusqu''à 750 g',     3),
        (1000,   959, 'Jusqu''à 1 kg',      4),
        (2000,  1119, 'Jusqu''à 2 kg',      5),
        (5000,  1739, 'Jusqu''à 5 kg',      6),
        (10000, 2529, 'Jusqu''à 10 kg',     7),
        (15000, 3199, 'Jusqu''à 15 kg',     8),
        (30000, 3959, 'Jusqu''à 30 kg',     9)
      ) AS seed(max_grams, fee_centimes, label, position)
      WHERE NOT EXISTS (SELECT 1 FROM "boutique_shipping_tiers" LIMIT 1);
    `);

    // === Migration tarifs Colissimo 2026 ===
    // Met à jour les paliers EXISTANTS qui correspondent encore aux anciens
    // prix par défaut (issu du seed 2024). Si l'admin a customisé un palier
    // (fee différent de l'ancienne valeur par défaut), on respecte sa
    // modification et on ne touche pas.
    // Mapping : max_grams → (ancien_fee_centimes, nouveau_fee_centimes_2026)
    const colissimo2026Migration: Array<[number, number, number]> = [
      [250, 515, 549],
      [500, 695, 759],
      [750, 830, 929],
      [1000, 940, 959],
      [2000, 1090, 1119],
      [5000, 1480, 1739],
      [10000, 1840, 2529],
      [15000, 2510, 3199],
      [30000, 3230, 3959],
    ];
    for (const [maxGrams, oldFee, newFee] of colissimo2026Migration) {
      await prisma.$executeRawUnsafe(
        `UPDATE "boutique_shipping_tiers"
         SET fee_centimes = $1
         WHERE max_grams = $2 AND fee_centimes = $3`,
        newFee,
        maxGrams,
        oldFee,
      );
    }

    runtimeSchemaEnsured = true;
  } catch (err) {
    console.warn(
      "[ensureRuntimeSchema] failed (the migration may still apply via prisma migrate deploy):",
      err,
    );
  }
}
