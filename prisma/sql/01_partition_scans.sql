-- À appliquer APRÈS la migration initiale Prisma.
-- Convertit la table `scans` en table partitionnée mensuellement (range sur scanned_at).
-- Prisma 7 ne supporte pas PARTITION BY de manière déclarative.
--
-- Usage : psql $DATABASE_URL -f prisma/sql/01_partition_scans.sql
-- (ou via Railway DB shell)

BEGIN;

-- 1. Drop la table créée par Prisma (vide en initial migrate)
DROP TABLE IF EXISTS scans CASCADE;

-- 2. Recrée en partitionnée
CREATE TABLE scans (
  id BIGSERIAL,
  qrcode_id BIGINT,
  restaurant_id BIGINT,
  lang VARCHAR(2),
  user_agent TEXT,
  pays VARCHAR(2),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, scanned_at)
) PARTITION BY RANGE (scanned_at);

-- 3. Index sur la table parent (héritage automatique aux partitions)
CREATE INDEX idx_scans_restaurant_date
  ON scans (restaurant_id, scanned_at DESC);

-- 4. Partitions initiales (3 mois glissants)
CREATE TABLE IF NOT EXISTS scans_2026_05 PARTITION OF scans
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS scans_2026_06 PARTITION OF scans
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS scans_2026_07 PARTITION OF scans
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS scans_2026_08 PARTITION OF scans
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- 5. Catch-all pour éviter d'oublier une partition (à monitorer)
CREATE TABLE IF NOT EXISTS scans_default PARTITION OF scans DEFAULT;

COMMIT;

-- ⚠ Pense à créer une fonction + cron Railway qui ajoute automatiquement
-- les partitions du mois suivant chaque 1er du mois.
