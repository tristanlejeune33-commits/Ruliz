-- Affichage du nom du restaurant dans l'en-tête de la carte digitale /carte/[id].
-- Default true : le nom est affiché par défaut. Le restaurateur peut le masquer
-- depuis /dashboard/restaurant (ex: le nom est déjà dans le logo / la bannière).
-- IF NOT EXISTS : idempotent (la colonne peut déjà avoir été ajoutée à chaud
-- par ensureRuntimeSchema sur un déploiement précédent).
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "show_name" BOOLEAN NOT NULL DEFAULT true;
