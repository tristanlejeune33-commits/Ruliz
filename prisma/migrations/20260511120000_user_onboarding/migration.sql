-- Migration : Onboarding tour (bulle guidée première connexion)
-- Ajoute 6 colonnes au modèle users pour persister l'état du tour.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboarding_step" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "onboarding_skipped" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "onboarding_started_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "onboarding_self_scanned" BOOLEAN NOT NULL DEFAULT FALSE;
