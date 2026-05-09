-- Add auto-popup + scheduling fields to jeux
ALTER TABLE "jeux"
  ADD COLUMN IF NOT EXISTS "auto_popup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "auto_popup_delay_sec" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "date_debut" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "date_fin" TIMESTAMPTZ;
