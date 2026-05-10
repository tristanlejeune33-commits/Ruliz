-- Migration fantôme : marque comme appliquée puis supprimée du file system.
-- Doit être nettoyée manuellement avant de pouvoir avancer.
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260510070000_boutique_stock_max';
