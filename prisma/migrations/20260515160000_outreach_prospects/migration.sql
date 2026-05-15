-- Migration : Outreach campaign — prospect_restaurants + outreach_events + email_variants
-- Pipeline pré-vente : on génère des cartes "fantômes" pour 2000+ restaurants
-- scrapés (TripAdvisor + Google Places), on envoie en cold email avec lien
-- /preview/{token} perso, et on convertit en clients Stripe.
--
-- Idempotent : utilise IF NOT EXISTS partout pour permettre runtime ensure.

-- ============================================================================
-- 1) PROSPECT_RESTAURANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "prospect_restaurants" (
  "id" BIGSERIAL PRIMARY KEY,
  "source" VARCHAR(50) NOT NULL,

  -- Données brutes CSV
  "email" VARCHAR(255) NOT NULL,
  "nom" VARCHAR(255) NOT NULL,
  "ville" VARCHAR(120),
  "code_postal" VARCHAR(20),
  "adresse" TEXT,
  "telephone" VARCHAR(30),
  "site_web" TEXT,
  "rating" DOUBLE PRECISION,
  "nb_reviews" INTEGER,
  "niveau_prix" VARCHAR(10),
  "photo_cover" TEXT,
  "google_place_id" VARCHAR(120),

  -- Enrichissement
  "logo_url" TEXT,
  "couleur_dominante" VARCHAR(20),
  "menu_source_url" TEXT,
  "menu_source_type" VARCHAR(10),

  -- Carte générée
  "card_json" JSONB,
  "card_token" VARCHAR(40),

  -- Workflow
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "enriched_at" TIMESTAMPTZ,
  "generated_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "opened_at" TIMESTAMPTZ,
  "clicked_at" TIMESTAMPTZ,
  "converted_at" TIMESTAMPTZ,
  "error_message" TEXT,

  -- Tracking A/B
  "email_variant" VARCHAR(10),
  "followup_count" INTEGER NOT NULL DEFAULT 0,

  -- Lien activation
  "restaurant_id" BIGINT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contraintes / indexes
CREATE UNIQUE INDEX IF NOT EXISTS "prospect_restaurants_email_key"
  ON "prospect_restaurants" ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "prospect_restaurants_card_token_key"
  ON "prospect_restaurants" ("card_token");

CREATE INDEX IF NOT EXISTS "idx_prospect_status"
  ON "prospect_restaurants" ("status");

CREATE INDEX IF NOT EXISTS "idx_prospect_source"
  ON "prospect_restaurants" ("source");

CREATE INDEX IF NOT EXISTS "idx_prospect_token"
  ON "prospect_restaurants" ("card_token");

CREATE INDEX IF NOT EXISTS "idx_prospect_ville"
  ON "prospect_restaurants" ("ville");

-- ============================================================================
-- 2) OUTREACH_EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "outreach_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "prospect_id" BIGINT NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "outreach_events_prospect_fk"
    FOREIGN KEY ("prospect_id")
    REFERENCES "prospect_restaurants" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_outreach_prospect_type"
  ON "outreach_events" ("prospect_id", "type");

CREATE INDEX IF NOT EXISTS "idx_outreach_created"
  ON "outreach_events" ("created_at");

-- ============================================================================
-- 3) EMAIL_VARIANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "email_variants" (
  "id" BIGSERIAL PRIMARY KEY,
  "campaign" VARCHAR(50) NOT NULL,
  "step" INTEGER NOT NULL,
  "variant" VARCHAR(5) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "body_html" TEXT NOT NULL,
  "generated_by" VARCHAR(10) NOT NULL DEFAULT 'ai',

  -- Stats live
  "sent" INTEGER NOT NULL DEFAULT 0,
  "opened" INTEGER NOT NULL DEFAULT 0,
  "clicked" INTEGER NOT NULL DEFAULT 0,
  "replied" INTEGER NOT NULL DEFAULT 0,
  "converted" INTEGER NOT NULL DEFAULT 0,

  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_email_variant"
  ON "email_variants" ("campaign", "step", "variant");

CREATE INDEX IF NOT EXISTS "idx_email_variant_active"
  ON "email_variants" ("campaign", "active");
