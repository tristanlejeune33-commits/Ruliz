-- Horaires de service customisables par restaurant (lunch / dinner / happy_hour)
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "lunch_start" VARCHAR(5) DEFAULT '11:30',
  ADD COLUMN IF NOT EXISTS "lunch_end" VARCHAR(5) DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS "dinner_start" VARCHAR(5) DEFAULT '18:30',
  ADD COLUMN IF NOT EXISTS "dinner_end" VARCHAR(5) DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS "happy_hour_start" VARCHAR(5) DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS "happy_hour_end" VARCHAR(5) DEFAULT '19:00';
