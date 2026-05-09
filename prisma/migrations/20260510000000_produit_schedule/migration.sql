-- Schedule sur produits (override de la catégorie parente)
ALTER TABLE "produits"
  ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
  ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567';
