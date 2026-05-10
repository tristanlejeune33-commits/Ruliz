-- Stock maximum (capacité totale) sur les produits boutique QR.
-- null = stock illimité. Le stock restant est calculé dynamiquement côté
-- server (somme des items.quantite des commandes non annulées).
ALTER TABLE "boutique_produits" ADD COLUMN IF NOT EXISTS "stock_max" INTEGER;

-- Cosmétique : DROP DEFAULT sur les updated_at (Prisma utilise @updatedAt
-- côté ORM, pas besoin d'un default DB)
ALTER TABLE "boutique_commandes" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "boutique_produits" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropIndex (bonus de cleanup hérité)
DROP INDEX IF EXISTS "idx_produits_clic_count";
