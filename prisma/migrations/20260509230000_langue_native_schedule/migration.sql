-- Restaurant : langue native (par défaut FR)
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "langue_native" VARCHAR(2) NOT NULL DEFAULT 'fr';

-- Catégories : système de créneaux horaires
-- "always" = défaut, toujours visible
-- "lunch" = service midi (11:30-15:00), "dinner" = service soir (18:30-23:00)
-- "happy_hour" = créneau apéro (18:00-19:00)
-- "custom" = utilise schedule_start/schedule_end + schedule_days
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
  ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567';
