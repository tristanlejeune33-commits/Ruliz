-- ============================================================================
-- Boutique QR — catalogue interne de produits que les clients restaurateurs
-- peuvent commander depuis leur dashboard.
-- ============================================================================

-- Enums
CREATE TYPE "BoutiqueProduitStatut" AS ENUM ('brouillon', 'publie', 'archive');
CREATE TYPE "BoutiqueCommandeStatut" AS ENUM ('en_attente', 'en_preparation', 'expediee', 'livree', 'annulee');

-- Table : catalogue produits (géré par admin uniquement)
CREATE TABLE "boutique_produits" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "prix_centimes" INTEGER NOT NULL,
    "devise" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "image_url" VARCHAR(500),
    "categorie" VARCHAR(100),
    "position" INTEGER NOT NULL DEFAULT 0,
    "statut" "BoutiqueProduitStatut" NOT NULL DEFAULT 'brouillon',
    "features_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boutique_produits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "boutique_produits_slug_key" ON "boutique_produits"("slug");
CREATE INDEX "idx_boutique_produits_statut_position" ON "boutique_produits"("statut", "position");

-- Table : commandes clients (1 ligne = 1 produit)
CREATE TABLE "boutique_commandes" (
    "id" BIGSERIAL NOT NULL,
    "produit_id" BIGINT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "restaurant_id" BIGINT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prix_unitaire" INTEGER NOT NULL,
    "total_centimes" INTEGER NOT NULL,
    "devise" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "livraison_nom" VARCHAR(255),
    "livraison_adresse" TEXT,
    "livraison_code_postal" VARCHAR(10),
    "livraison_ville" VARCHAR(100),
    "livraison_pays" VARCHAR(100) DEFAULT 'France',
    "livraison_telephone" VARCHAR(20),
    "notes_client" TEXT,
    "notes_admin" TEXT,
    "statut" "BoutiqueCommandeStatut" NOT NULL DEFAULT 'en_attente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boutique_commandes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_boutique_commandes_user" ON "boutique_commandes"("user_id", "created_at" DESC);
CREATE INDEX "idx_boutique_commandes_statut" ON "boutique_commandes"("statut", "created_at" DESC);
CREATE INDEX "idx_boutique_commandes_produit" ON "boutique_commandes"("produit_id");

-- Foreign keys
ALTER TABLE "boutique_commandes" ADD CONSTRAINT "boutique_commandes_produit_id_fkey"
  FOREIGN KEY ("produit_id") REFERENCES "boutique_produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "boutique_commandes" ADD CONSTRAINT "boutique_commandes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "boutique_commandes" ADD CONSTRAINT "boutique_commandes_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
