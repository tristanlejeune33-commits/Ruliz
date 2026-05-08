-- Personnalisation visuelle de la carte publique : description, devise par défaut,
-- choix de thème (clair/sombre), de typographie (modern/editorial/elegant), et 5 couleurs.
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "devise_default" VARCHAR(5) DEFAULT '€',
  ADD COLUMN IF NOT EXISTS "theme" VARCHAR(10) DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS "font_style" VARCHAR(20) DEFAULT 'editorial',
  ADD COLUMN IF NOT EXISTS "couleur_fond" VARCHAR(7),
  ADD COLUMN IF NOT EXISTS "couleur_texte_titre" VARCHAR(7),
  ADD COLUMN IF NOT EXISTS "couleur_categorie" VARCHAR(7);
