-- Migration : Restaurant.sms_sender — nom d'expéditeur SMS personnalisable
-- par restaurateur (max 11 caractères alphanumériques, contrainte Brevo).

ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "sms_sender" VARCHAR(11);
