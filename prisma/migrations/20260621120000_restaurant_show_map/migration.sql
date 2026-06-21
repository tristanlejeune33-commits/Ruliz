-- Affichage de la carte Google Maps sur la carte digitale publique /carte/[id].
-- Default false : plus d'affichage automatique, le restaurateur l'active dans
-- /dashboard/restaurant (onglet Thème).
-- IF NOT EXISTS : idempotent (la colonne peut déjà avoir été ajoutée à chaud
-- par ensureRuntimeSchema sur un déploiement précédent).
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "show_map" BOOLEAN NOT NULL DEFAULT false;
