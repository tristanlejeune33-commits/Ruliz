-- Add translated fields to produit_translations for the chef's note + origin
ALTER TABLE "produit_translations"
  ADD COLUMN IF NOT EXISTS "titre_remarque" TEXT,
  ADD COLUMN IF NOT EXISTS "description_remarque" TEXT,
  ADD COLUMN IF NOT EXISTS "origine" TEXT;
