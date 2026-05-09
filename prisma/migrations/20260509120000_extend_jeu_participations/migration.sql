-- Add fields to jeu_participations for the full roulette form
-- (nom, naissance, action_sociale, ip)
ALTER TABLE "jeu_participations"
  ADD COLUMN IF NOT EXISTS "nom" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "naissance" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "action_sociale" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "ip" VARCHAR(45);

-- Optional index on email for fast lookups (anti-spam check, dedup)
CREATE INDEX IF NOT EXISTS "idx_participations_email" ON "jeu_participations" ("email");
