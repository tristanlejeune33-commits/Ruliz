-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'client', 'team');

-- CreateEnum
CREATE TYPE "user_statut" AS ENUM ('actif', 'suspendu', 'archive', 'demo_terminee');

-- CreateEnum
CREATE TYPE "plan" AS ENUM ('freemium', 'pro', 'premium');

-- CreateEnum
CREATE TYPE "categorie_mode" AS ENUM ('liste', 'grille', 'carrousel');

-- CreateTable
CREATE TABLE "auth_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "prenom" VARCHAR(100),
    "nom" VARCHAR(100),
    "telephone" VARCHAR(20),
    "adresse" TEXT,
    "code_postal" VARCHAR(10),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100) DEFAULT 'France',
    "role" "user_role" NOT NULL DEFAULT 'client',
    "statut" "user_statut" NOT NULL DEFAULT 'actif',
    "demo_active" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "member_user_id" INTEGER NOT NULL,
    "role_member" VARCHAR(50) NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "telephone" VARCHAR(20),
    "adresse" TEXT,
    "code_postal" VARCHAR(10),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100),
    "plan" "plan" NOT NULL DEFAULT 'freemium',
    "statut" VARCHAR(20) NOT NULL DEFAULT 'actif',
    "stripe_subscription_id" VARCHAR(255),
    "stripe_price_id" VARCHAR(255),
    "stripe_subscription_status" VARCHAR(50),
    "stripe_current_period_end" TIMESTAMPTZ,
    "logo_url" TEXT,
    "banniere_url" TEXT,
    "couleur_primaire" VARCHAR(7) DEFAULT '#1F2937',
    "couleur_secondaire" VARCHAR(7),
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "tiktok_url" TEXT,
    "site_web" TEXT,
    "google_review_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qrcodes" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" BIGINT NOT NULL,
    "code_unique" VARCHAR(20) NOT NULL,
    "png_url" TEXT,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'actif',
    "assigned_at" TIMESTAMPTZ,
    "scan_total" BIGINT NOT NULL DEFAULT 0,
    "scan_mois" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qrcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "titre" VARCHAR(255) NOT NULL,
    "icone" VARCHAR(50),
    "position" INTEGER NOT NULL DEFAULT 0,
    "affiche" BOOLEAN NOT NULL DEFAULT true,
    "mode_affichage" "categorie_mode" NOT NULL DEFAULT 'liste',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" BIGSERIAL NOT NULL,
    "categorie_id" BIGINT NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "prix" DECIMAL(10,2),
    "devise" VARCHAR(5) DEFAULT '€',
    "description_prix" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'affiche',
    "est_nouveau" BOOLEAN NOT NULL DEFAULT false,
    "origine" VARCHAR(2),
    "titre_remarque" VARCHAR(255),
    "description_remarque" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vignettes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "label_fr" VARCHAR(100) NOT NULL,
    "icone" VARCHAR(50),

    CONSTRAINT "vignettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_vignettes" (
    "produit_id" BIGINT NOT NULL,
    "vignette_id" INTEGER NOT NULL,

    CONSTRAINT "produit_vignettes_pkey" PRIMARY KEY ("produit_id","vignette_id")
);

-- CreateTable
CREATE TABLE "allergenes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "label_fr" VARCHAR(100) NOT NULL,

    CONSTRAINT "allergenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_allergenes" (
    "produit_id" BIGINT NOT NULL,
    "allergene_id" INTEGER NOT NULL,

    CONSTRAINT "produit_allergenes_pkey" PRIMARY KEY ("produit_id","allergene_id")
);

-- CreateTable
CREATE TABLE "produit_suggestions" (
    "produit_id" BIGINT NOT NULL,
    "suggestion_id" BIGINT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "produit_suggestions_pkey" PRIMARY KEY ("produit_id","suggestion_id")
);

-- CreateTable
CREATE TABLE "produit_translations" (
    "produit_id" BIGINT NOT NULL,
    "lang" VARCHAR(2) NOT NULL,
    "titre" TEXT,
    "description" TEXT,
    "description_prix" TEXT,
    "source" VARCHAR(20) NOT NULL DEFAULT 'anthropic',
    "translated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produit_translations_pkey" PRIMARY KEY ("produit_id","lang")
);

-- CreateTable
CREATE TABLE "categorie_translations" (
    "categorie_id" BIGINT NOT NULL,
    "lang" VARCHAR(2) NOT NULL,
    "titre" TEXT,

    CONSTRAINT "categorie_translations_pkey" PRIMARY KEY ("categorie_id","lang")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" BIGSERIAL NOT NULL,
    "qrcode_id" BIGINT,
    "restaurant_id" BIGINT,
    "lang" VARCHAR(2),
    "user_agent" TEXT,
    "pays" VARCHAR(2),
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id","scanned_at")
);

-- CreateTable
CREATE TABLE "jeux" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" BIGINT NOT NULL,
    "nom" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jeux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jeu_participations" (
    "id" BIGSERIAL NOT NULL,
    "jeu_id" BIGINT NOT NULL,
    "email" VARCHAR(255),
    "prenom" VARCHAR(100),
    "telephone" VARCHAR(20),
    "lot_gagne" VARCHAR(255),
    "participated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jeu_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popups" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" BIGINT NOT NULL,
    "titre" VARCHAR(255),
    "description" TEXT,
    "image_url" TEXT,
    "cta_label" VARCHAR(100),
    "cta_url" TEXT,
    "date_debut" TIMESTAMPTZ,
    "date_fin" TIMESTAMPTZ,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_clients" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" BIGINT NOT NULL,
    "email" VARCHAR(255),
    "telephone" VARCHAR(20),
    "prenom" VARCHAR(100),
    "source" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "base_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(50),
    "details" JSONB,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_user_id_key" ON "auth_user"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_user_id_idx" ON "auth_session"("user_id");

-- CreateIndex
CREATE INDEX "auth_account_user_id_idx" ON "auth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_statut" ON "users"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_stripe_subscription_id_key" ON "restaurants"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_restaurants_user" ON "restaurants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "qrcodes_code_unique_key" ON "qrcodes"("code_unique");

-- CreateIndex
CREATE INDEX "idx_qrcodes_restaurant" ON "qrcodes"("restaurant_id");

-- CreateIndex
CREATE INDEX "idx_qrcodes_code" ON "qrcodes"("code_unique");

-- CreateIndex
CREATE INDEX "idx_categories_restaurant" ON "categories"("restaurant_id", "position");

-- CreateIndex
CREATE INDEX "idx_categories_parent" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_produits_categorie_pos" ON "produits"("categorie_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "vignettes_code_key" ON "vignettes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "allergenes_code_key" ON "allergenes"("code");

-- CreateIndex
CREATE INDEX "idx_suggestions_produit" ON "produit_suggestions"("produit_id", "position");

-- CreateIndex
CREATE INDEX "idx_scans_restaurant_date" ON "scans"("restaurant_id", "scanned_at" DESC);

-- CreateIndex
CREATE INDEX "idx_participations_jeu" ON "jeu_participations"("jeu_id", "participated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_baseclients_restaurant" ON "base_clients"("restaurant_id");

-- CreateIndex
CREATE INDEX "idx_logs_user" ON "logs"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qrcodes" ADD CONSTRAINT "qrcodes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_vignettes" ADD CONSTRAINT "produit_vignettes_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_vignettes" ADD CONSTRAINT "produit_vignettes_vignette_id_fkey" FOREIGN KEY ("vignette_id") REFERENCES "vignettes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_allergenes" ADD CONSTRAINT "produit_allergenes_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_allergenes" ADD CONSTRAINT "produit_allergenes_allergene_id_fkey" FOREIGN KEY ("allergene_id") REFERENCES "allergenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_suggestions" ADD CONSTRAINT "produit_suggestions_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_suggestions" ADD CONSTRAINT "produit_suggestions_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_translations" ADD CONSTRAINT "produit_translations_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorie_translations" ADD CONSTRAINT "categorie_translations_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jeux" ADD CONSTRAINT "jeux_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jeu_participations" ADD CONSTRAINT "jeu_participations_jeu_id_fkey" FOREIGN KEY ("jeu_id") REFERENCES "jeux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popups" ADD CONSTRAINT "popups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "base_clients" ADD CONSTRAINT "base_clients_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
