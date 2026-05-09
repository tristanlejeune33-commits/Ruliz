-- Code pays + langue native déduite (pour pré-remplir le restaurant créé après signup)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "country_code" VARCHAR(2) DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS "langue_native" VARCHAR(2) DEFAULT 'fr';
