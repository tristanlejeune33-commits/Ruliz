-- Migration : SMS marketing — système de crédits
-- Crée les tables : sms_balance, sms_credit_purchases, sms_messages,
-- sms_campaigns, sms_automations
-- + Ajoute des colonnes à base_clients pour les tags ({nom}, anniversaire, opt-in)

-- ============================================================
-- base_clients : champs additionnels pour tags + automatisations
-- ============================================================
ALTER TABLE "base_clients"
  ADD COLUMN IF NOT EXISTS "nom" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "anniversaire" DATE,
  ADD COLUMN IF NOT EXISTS "opt_in_sms" BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- sms_balance : solde par restaurant (1 ligne par resto)
-- ============================================================
CREATE TABLE IF NOT EXISTS "sms_balance" (
  "id"             BIGSERIAL    PRIMARY KEY,
  "restaurant_id"  BIGINT       NOT NULL UNIQUE,
  "balance"        INTEGER      NOT NULL DEFAULT 0,
  "total_acquired" INTEGER      NOT NULL DEFAULT 0,
  "total_spent"    INTEGER      NOT NULL DEFAULT 0,
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sms_balance_resto" ON "sms_balance"("restaurant_id");

-- ============================================================
-- sms_credit_purchases : historique des achats Stripe
-- ============================================================
CREATE TABLE IF NOT EXISTS "sms_credit_purchases" (
  "id"                  BIGSERIAL    PRIMARY KEY,
  "restaurant_id"       BIGINT       NOT NULL,
  "pack_size"           INTEGER      NOT NULL,
  "price_paid_centimes" INTEGER      NOT NULL,
  "stripe_session_id"   VARCHAR(255) UNIQUE,
  "status"              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "paid_at"             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_sms_purchase_resto" ON "sms_credit_purchases"("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_sms_purchase_status" ON "sms_credit_purchases"("status");

-- ============================================================
-- sms_messages : log de chaque SMS envoyé
-- ============================================================
CREATE TABLE IF NOT EXISTS "sms_messages" (
  "id"             BIGSERIAL    PRIMARY KEY,
  "restaurant_id"  BIGINT       NOT NULL,
  "recipient"      VARCHAR(20)  NOT NULL,
  "content"        TEXT         NOT NULL,
  "segments"       INTEGER      NOT NULL DEFAULT 1,
  "status"         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "brevo_ref"      VARCHAR(255),
  "campaign_id"    BIGINT,
  "trigger_type"   VARCHAR(50),
  "error_message"  TEXT,
  "sent_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sms_message_resto" ON "sms_messages"("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_sms_message_campaign" ON "sms_messages"("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_sms_message_sent_at" ON "sms_messages"("sent_at");

-- ============================================================
-- sms_campaigns : campagnes blast (groupées)
-- ============================================================
CREATE TABLE IF NOT EXISTS "sms_campaigns" (
  "id"               BIGSERIAL    PRIMARY KEY,
  "restaurant_id"    BIGINT       NOT NULL,
  "title"            VARCHAR(255) NOT NULL,
  "message_template" TEXT         NOT NULL,
  "target_filter"    VARCHAR(100) NOT NULL DEFAULT 'all',
  "total_sent"       INTEGER      NOT NULL DEFAULT 0,
  "total_failed"     INTEGER      NOT NULL DEFAULT 0,
  "total_skipped"    INTEGER      NOT NULL DEFAULT 0,
  "tokens_spent"     INTEGER      NOT NULL DEFAULT 0,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'draft',
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "sent_at"          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_sms_campaign_resto" ON "sms_campaigns"("restaurant_id");

-- ============================================================
-- sms_automations : déclencheurs récurrents (anniversaire, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS "sms_automations" (
  "id"               BIGSERIAL    PRIMARY KEY,
  "restaurant_id"    BIGINT       NOT NULL,
  "trigger_type"     VARCHAR(50)  NOT NULL,
  "message_template" TEXT         NOT NULL,
  "days_offset"      INTEGER      NOT NULL DEFAULT 0,
  "send_hour"        INTEGER      NOT NULL DEFAULT 10,
  "active"           BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sms_auto_resto" ON "sms_automations"("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_sms_auto_trigger_active" ON "sms_automations"("trigger_type", "active");
