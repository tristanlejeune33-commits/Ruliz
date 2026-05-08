-- ============================================
-- RULIZ - Schéma DB optimisé read-heavy
-- ============================================

-- ====== USERS ======
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  prenom VARCHAR(100),
  nom VARCHAR(100),
  telephone VARCHAR(20),
  adresse TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  pays VARCHAR(100) DEFAULT 'France',
  role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('admin','client','team')),
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','suspendu','archive','demo_terminee')),
  demo_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_statut ON users(statut);

-- ====== TEAM MEMBERS ======
CREATE TABLE team_members (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  member_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role_member VARCHAR(50) DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== RESTAURANTS ======
CREATE TABLE restaurants (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telephone VARCHAR(20),
  adresse TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  pays VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'freemium' CHECK (plan IN ('freemium','pro','premium')),
  statut VARCHAR(20) DEFAULT 'actif',
  stripe_subscription_id VARCHAR(255),
  logo_url TEXT,
  banniere_url TEXT,
  couleur_primaire VARCHAR(7) DEFAULT '#1F2937',
  couleur_secondaire VARCHAR(7),
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  site_web TEXT,
  google_review_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_restaurants_user ON restaurants(user_id);

-- ====== QR CODES ======
CREATE TABLE qrcodes (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  code_unique VARCHAR(20) UNIQUE NOT NULL,
  png_url TEXT,
  statut VARCHAR(20) DEFAULT 'actif',
  assigned_at TIMESTAMPTZ,
  scan_total BIGINT DEFAULT 0,
  scan_mois BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qrcodes_restaurant ON qrcodes(restaurant_id);
CREATE INDEX idx_qrcodes_code ON qrcodes(code_unique);

-- ====== CATEGORIES ======
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL,
  icone VARCHAR(50),
  position INT NOT NULL DEFAULT 0,
  affiche BOOLEAN DEFAULT true,
  mode_affichage VARCHAR(20) DEFAULT 'liste' CHECK (mode_affichage IN ('liste','grille','carrousel')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_restaurant ON categories(restaurant_id, position) WHERE affiche = true;
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ====== PRODUITS ======
CREATE TABLE produits (
  id BIGSERIAL PRIMARY KEY,
  categorie_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  prix DECIMAL(10,2),
  devise VARCHAR(5) DEFAULT '€',
  description_prix TEXT,
  position INT NOT NULL DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'affiche',
  est_nouveau BOOLEAN DEFAULT false,
  origine VARCHAR(2),
  titre_remarque VARCHAR(255),
  description_remarque TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_produits_categorie_pos ON produits(categorie_id, position) WHERE statut = 'affiche';

-- ====== VIGNETTES ======
CREATE TABLE vignettes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label_fr VARCHAR(100) NOT NULL,
  icone VARCHAR(50)
);
CREATE TABLE produit_vignettes (
  produit_id BIGINT REFERENCES produits(id) ON DELETE CASCADE,
  vignette_id INT REFERENCES vignettes(id) ON DELETE CASCADE,
  PRIMARY KEY (produit_id, vignette_id)
);

-- ====== ALLERGENES ======
CREATE TABLE allergenes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label_fr VARCHAR(100) NOT NULL
);
CREATE TABLE produit_allergenes (
  produit_id BIGINT REFERENCES produits(id) ON DELETE CASCADE,
  allergene_id INT REFERENCES allergenes(id) ON DELETE CASCADE,
  PRIMARY KEY (produit_id, allergene_id)
);

-- ====== SUGGESTIONS ======
CREATE TABLE produit_suggestions (
  produit_id BIGINT REFERENCES produits(id) ON DELETE CASCADE,
  suggestion_id BIGINT REFERENCES produits(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  PRIMARY KEY (produit_id, suggestion_id),
  CHECK (produit_id <> suggestion_id)
);
CREATE INDEX idx_suggestions_produit ON produit_suggestions(produit_id, position);

-- ====== TRADUCTIONS (cache anti-coût Anthropic) ======
CREATE TABLE produit_translations (
  produit_id BIGINT REFERENCES produits(id) ON DELETE CASCADE,
  lang VARCHAR(2),
  titre TEXT,
  description TEXT,
  description_prix TEXT,
  source VARCHAR(20) DEFAULT 'anthropic',
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (produit_id, lang)
);
CREATE TABLE categorie_translations (
  categorie_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  lang VARCHAR(2),
  titre TEXT,
  PRIMARY KEY (categorie_id, lang)
);

-- ====== SCANS (table partitionnée mensuellement) ======
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
CREATE TABLE scans_2026_05 PARTITION OF scans
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE scans_2026_06 PARTITION OF scans
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE scans_2026_07 PARTITION OF scans
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE INDEX idx_scans_restaurant_date ON scans(restaurant_id, scanned_at DESC);

-- ====== JEUX (Roulette) ======
CREATE TABLE jeux (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  nom VARCHAR(255),
  actif BOOLEAN DEFAULT true,
  config_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE jeu_participations (
  id BIGSERIAL PRIMARY KEY,
  jeu_id BIGINT REFERENCES jeux(id) ON DELETE CASCADE,
  email VARCHAR(255),
  prenom VARCHAR(100),
  telephone VARCHAR(20),
  lot_gagne VARCHAR(255),
  participated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_participations_jeu ON jeu_participations(jeu_id, participated_at DESC);

-- ====== POPUPS ======
CREATE TABLE popups (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  titre VARCHAR(255),
  description TEXT,
  image_url TEXT,
  cta_label VARCHAR(100),
  cta_url TEXT,
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  actif BOOLEAN DEFAULT true
);

-- ====== BASE CLIENTS (data marketing) ======
CREATE TABLE base_clients (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  email VARCHAR(255),
  telephone VARCHAR(20),
  prenom VARCHAR(100),
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_baseclients_restaurant ON base_clients(restaurant_id);

-- ====== LOGS ======
CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50),
  details JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_logs_user ON logs(user_id, created_at DESC);
