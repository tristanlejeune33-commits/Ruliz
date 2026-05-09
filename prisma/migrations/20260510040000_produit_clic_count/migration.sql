-- Compteur de clics (ouvertures du modal détail) par produit
ALTER TABLE "produits"
  ADD COLUMN IF NOT EXISTS "clic_count" INTEGER NOT NULL DEFAULT 0;

-- Index pour pouvoir trier rapidement par popularité
CREATE INDEX IF NOT EXISTS "idx_produits_clic_count" ON "produits" ("clic_count" DESC);
