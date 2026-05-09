-- ============================================================================
-- Boutique : passage à un schema multi-items
-- Avant : 1 commande = 1 produit (produit_id sur boutique_commandes)
-- Après : 1 commande = N items via table dédiée boutique_commande_items
-- ============================================================================

-- 1. Drop la contrainte FK + colonnes produit-spécifiques de boutique_commandes
--    (pas de données prod à préserver — la boutique vient juste d'être livrée)
DROP INDEX IF EXISTS "idx_boutique_commandes_produit";
ALTER TABLE "boutique_commandes" DROP CONSTRAINT IF EXISTS "boutique_commandes_produit_id_fkey";
ALTER TABLE "boutique_commandes"
  DROP COLUMN IF EXISTS "produit_id",
  DROP COLUMN IF EXISTS "quantite",
  DROP COLUMN IF EXISTS "prix_unitaire";

-- 2. Nouvelle table : items de commande
CREATE TABLE "boutique_commande_items" (
    "id" BIGSERIAL NOT NULL,
    "commande_id" BIGINT NOT NULL,
    "produit_id" BIGINT NOT NULL,
    "produit_nom" VARCHAR(255) NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prix_unitaire" INTEGER NOT NULL,
    "total_centimes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boutique_commande_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_boutique_commande_items_commande" ON "boutique_commande_items"("commande_id");
CREATE INDEX "idx_boutique_commande_items_produit" ON "boutique_commande_items"("produit_id");

-- 3. FK
ALTER TABLE "boutique_commande_items" ADD CONSTRAINT "boutique_commande_items_commande_id_fkey"
  FOREIGN KEY ("commande_id") REFERENCES "boutique_commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "boutique_commande_items" ADD CONSTRAINT "boutique_commande_items_produit_id_fkey"
  FOREIGN KEY ("produit_id") REFERENCES "boutique_produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
