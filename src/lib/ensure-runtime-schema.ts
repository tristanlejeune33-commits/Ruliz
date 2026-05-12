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

    runtimeSchemaEnsured = true;
  } catch (err) {
    console.warn(
      "[ensureRuntimeSchema] failed (the migration may still apply via prisma migrate deploy):",
      err,
    );
  }
}
