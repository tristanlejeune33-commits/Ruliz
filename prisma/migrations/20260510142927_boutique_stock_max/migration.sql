-- DropIndex
DROP INDEX "idx_produits_clic_count";

-- AlterTable
ALTER TABLE "boutique_commandes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "boutique_produits" ALTER COLUMN "updated_at" DROP DEFAULT;
