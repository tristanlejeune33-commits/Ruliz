-- Migration : SmsCampaign — planification d'envoi + snapshot sender + cibles
-- Permet de programmer une campagne pour plus tard (status="scheduled") +
-- garder en mémoire le sender utilisé et les IDs de clients ciblés.

ALTER TABLE "sms_campaigns"
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "target_client_ids" JSONB,
  ADD COLUMN IF NOT EXISTS "sender_name" VARCHAR(11);

CREATE INDEX IF NOT EXISTS "idx_sms_campaign_scheduled"
  ON "sms_campaigns" ("status", "scheduled_at");
