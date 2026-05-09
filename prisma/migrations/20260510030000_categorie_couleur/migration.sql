-- Couleur custom par catégorie (override le theme global du resto)
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "couleur" VARCHAR(7);
