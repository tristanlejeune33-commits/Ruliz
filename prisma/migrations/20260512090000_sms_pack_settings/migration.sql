-- Migration : Table sms_pack_settings — admin peut éditer les prix
-- des packs SMS depuis /admin/settings sans redéploiement.

CREATE TABLE IF NOT EXISTS "sms_pack_settings" (
  "pack_id"        VARCHAR(20)  PRIMARY KEY,
  "size"           INTEGER      NOT NULL,
  "price_centimes" INTEGER      NOT NULL,
  "label"          VARCHAR(100) NOT NULL,
  "badge"          VARCHAR(50),
  "active"         BOOLEAN      NOT NULL DEFAULT TRUE,
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed avec les valeurs par défaut (idempotent ON CONFLICT)
INSERT INTO "sms_pack_settings" (pack_id, size, price_centimes, label, badge, active)
VALUES
  ('starter', 100,  990,   'Pack Découverte', NULL,         TRUE),
  ('boost',   500,  3990,  'Pack Boost',      'Populaire',  TRUE),
  ('growth',  1000, 6990,  'Pack Croissance', NULL,         TRUE),
  ('scale',   5000, 29900, 'Pack Maxi',       'Économie',   TRUE)
ON CONFLICT (pack_id) DO NOTHING;
