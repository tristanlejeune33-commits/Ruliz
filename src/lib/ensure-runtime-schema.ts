import "server-only";
import { prisma } from "./db";

/**
 * Auto-ensure des colonnes/tables critiques au runtime.
 *
 * Pourquoi ? Quand on ajoute une colonne via une migration Prisma, il y a
 * un risque que :
 *   1. Le code soit déployé AVANT que `prisma migrate deploy` ne tourne sur Railway
 *   2. Le client Prisma régénéré utilise la nouvelle colonne dans ses SELECT
 *   3. La DB ne l'a pas encore → P2022 column does not exist → tout crash
 *
 * Solution : à chaque démarrage du process Node, on s'assure que les
 * colonnes/tables critiques existent via `ALTER TABLE IF NOT EXISTS`.
 * Idempotent, ~1ms au 1er call, no-op ensuite (cached via flag module-level).
 *
 * Appelé dans les Server Components/queries qui sélectionnent ces tables.
 */

let runtimeSchemaEnsured = false;

/**
 * Helper qui execute une raw SQL et CATCH les erreurs individuellement.
 * Permet de ne pas interrompre la chaîne d'ALTERs si UN seul plante.
 * (par exemple : table renommée, FK qui crée un conflit, etc.)
 */
async function safeExec(sql: string, label: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (err) {
    console.warn(`[ensureRuntimeSchema] ${label} failed (continuing):`, err);
  }
}

/**
 * Force-run TOUS les ALTERs sans cache. Utilisé par la route admin
 * /api/admin/repair-schema pour repair manuel quand un ALTER n'a pas tourné.
 */
export async function repairRuntimeSchema(): Promise<{ ok: true }> {
  runtimeSchemaEnsured = false;
  await ensureRuntimeSchema();
  return { ok: true };
}

export async function ensureRuntimeSchema(): Promise<void> {
  if (runtimeSchemaEnsured) return;

  try {
    // === restaurants : colonnes ajoutées tardivement ===
    // SAFE_EXEC explicite pour ALTER timezone critique
    await safeExec(
      `ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris';`,
      "restaurants.timezone",
    );
    // Google Reviews — auto-fetch via Places API
    // - google_place_id : ID Google de l'établissement, cache permanent
    //   (résolu 1x via Find Place API depuis nom + adresse, puis stable)
    // - google_rating + google_reviews_count : note moyenne globale
    // - google_reviews_json : les 5 avis renvoyés par Place Details (JSONB)
    // - google_reviews_refreshed_at : timestamp dernier refresh
    //   (Google ToS interdit cache >30j → cron Inngest refresh hebdo)
    await safeExec(
      `ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "google_place_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "google_rating" NUMERIC(2,1),
        ADD COLUMN IF NOT EXISTS "google_reviews_count" INTEGER,
        ADD COLUMN IF NOT EXISTS "google_reviews_json" JSONB,
        ADD COLUMN IF NOT EXISTS "google_reviews_refreshed_at" TIMESTAMPTZ;`,
      "restaurants.google_reviews_*",
    );

    // Horaires d'ouverture en texte libre (multi-lignes) — DEPRECATED v2.
    // Remplacé par horaires_service JSONB structuré jour-par-jour. Kept en
    // tant que colonne pour ne pas casser le legacy ; plus lu par le site v2.
    await safeExec(
      `ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "horaires_ouverture" TEXT;`,
      "restaurants.horaires_ouverture",
    );

    // Horaires de service structurés (v2) — array JSONB de 7 entries
    // ordonnées lun→dim avec { day, closed, midi:{start,end}|null,
    // soir:{start,end}|null }. Cf. src/lib/horaires-service.ts pour la
    // shape exacte et les helpers.
    await safeExec(
      `ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "horaires_service" JSONB;`,
      "restaurants.horaires_service",
    );

    // === Mini-site vitrine ===
    // site_enabled = false → la route /site/[id] retourne 404 tant que le
    // restaurateur n'a pas activé sa fonctionnalité (Pro/Premium uniquement).
    // site_config JSONB = structure éditable côté dashboard, type
    // RestaurantConfig v2 (cf. src/features/restaurant-site-v2/types.ts).
    await safeExec(
      `ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "site_enabled" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "site_config" JSONB,
        ADD COLUMN IF NOT EXISTS "site_updated_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "site_slug" VARCHAR(64),
        ADD COLUMN IF NOT EXISTS "site_views_count" BIGINT NOT NULL DEFAULT 0;`,
      "restaurants.site_*",
    );
    // Index unique sur le slug (un slug = un seul resto). Pas inclus dans
    // l'ALTER au-dessus pour pouvoir CATCH en cas de doublons existants.
    await safeExec(
      `CREATE UNIQUE INDEX IF NOT EXISTS "restaurants_site_slug_key"
         ON "restaurants" ("site_slug") WHERE "site_slug" IS NOT NULL;`,
      "restaurants.site_slug unique index",
    );
    // Table site_views : analytics du mini-site (séparée des scans carte
    // pour pouvoir faire le funnel site→carte sans confusion).
    await safeExec(
      `CREATE TABLE IF NOT EXISTS "site_views" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "user_agent" TEXT,
        "pays" VARCHAR(2),
        "lang" VARCHAR(2),
        "referer" TEXT,
        "section_clicked" VARCHAR(40)
      );`,
      "site_views table",
    );
    await safeExec(
      `CREATE INDEX IF NOT EXISTS "site_views_resto_idx" ON "site_views" ("restaurant_id", "viewed_at" DESC);`,
      "site_views index",
    );
    // Idem catégories/produits — colonnes créneaux critiques
    await safeExec(
      `ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
        ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567',
        ADD COLUMN IF NOT EXISTS "couleur" VARCHAR(7);`,
      "categories.schedule_*",
    );
    await safeExec(
      `ALTER TABLE "produits"
        ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
        ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567';`,
      "produits.schedule_*",
    );

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "sms_sender" VARCHAR(11);
    `);

    // === base_clients : champs SMS marketing ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "base_clients"
        ADD COLUMN IF NOT EXISTS "nom" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "anniversaire" DATE,
        ADD COLUMN IF NOT EXISTS "opt_in_sms" BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // === users : champs onboarding + i18n ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "onboarding_step" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "onboarding_skipped" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "onboarding_started_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "onboarding_self_scanned" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "country_code" VARCHAR(2) DEFAULT 'FR',
        ADD COLUMN IF NOT EXISTS "langue_native" VARCHAR(2) DEFAULT 'fr';
    `);

    // === restaurants : plan offert (cadeau bienvenue 14j Premium + admin) ===
    // Bloque le signup d'un nouveau compte si la colonne manque, car
    // createFirstRestaurant insère planOffertExpiresAt sur le 1er resto.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "plan_offert_expires_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "plan_offert_by_user_id" INTEGER;
    `);

    // === Horaires de service (presets créneaux catégories) ===
    // Lunch / Dinner / Happy Hour utilisés dans /dashboard/restaurant pour
    // pré-configurer les créneaux que les catégories peuvent réutiliser.
    // Sans ces colonnes, updateRestaurant plante silencieusement → l'auto-save
    // ne persiste rien et le user revoit ses anciennes valeurs au refresh.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "lunch_start"      VARCHAR(5) DEFAULT '11:30',
        ADD COLUMN IF NOT EXISTS "lunch_end"        VARCHAR(5) DEFAULT '15:00',
        ADD COLUMN IF NOT EXISTS "dinner_start"     VARCHAR(5) DEFAULT '18:30',
        ADD COLUMN IF NOT EXISTS "dinner_end"       VARCHAR(5) DEFAULT '23:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_start" VARCHAR(5) DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS "happy_hour_end"   VARCHAR(5) DEFAULT '19:00';
    `);

    // === Tables SMS marketing ===
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_balance" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL UNIQUE,
        "balance" INTEGER NOT NULL DEFAULT 0,
        "total_acquired" INTEGER NOT NULL DEFAULT 0,
        "total_spent" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_credit_purchases" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "pack_size" INTEGER NOT NULL,
        "price_paid_centimes" INTEGER NOT NULL,
        "stripe_session_id" VARCHAR(255) UNIQUE,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "paid_at" TIMESTAMPTZ
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_messages" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "recipient" VARCHAR(20) NOT NULL,
        "content" TEXT NOT NULL,
        "segments" INTEGER NOT NULL DEFAULT 1,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "brevo_ref" VARCHAR(255),
        "campaign_id" BIGINT,
        "trigger_type" VARCHAR(50),
        "error_message" TEXT,
        "sent_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_campaigns" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message_template" TEXT NOT NULL,
        "target_filter" VARCHAR(100) NOT NULL DEFAULT 'all',
        "total_sent" INTEGER NOT NULL DEFAULT 0,
        "total_failed" INTEGER NOT NULL DEFAULT 0,
        "total_skipped" INTEGER NOT NULL DEFAULT 0,
        "tokens_spent" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "sent_at" TIMESTAMPTZ
      );
    `);

    // Colonnes ajoutées par migration 20260513090000_sms_campaign_scheduling
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "sms_campaigns"
        ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "target_client_ids" JSONB,
        ADD COLUMN IF NOT EXISTS "sender_name" VARCHAR(11);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_sms_campaign_scheduled"
        ON "sms_campaigns" ("status", "scheduled_at");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_automations" (
        "id" BIGSERIAL PRIMARY KEY,
        "restaurant_id" BIGINT NOT NULL,
        "trigger_type" VARCHAR(50) NOT NULL,
        "message_template" TEXT NOT NULL,
        "days_offset" INTEGER NOT NULL DEFAULT 0,
        "send_hour" INTEGER NOT NULL DEFAULT 10,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sms_pack_settings" (
        "pack_id" VARCHAR(20) PRIMARY KEY,
        "size" INTEGER NOT NULL,
        "price_centimes" INTEGER NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "badge" VARCHAR(50),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // === Boutique : frais de port (config globale, 1 seule ligne id=1) ===
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "boutique_shipping_settings" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "fee_centimes" INTEGER NOT NULL DEFAULT 590,
        "free_threshold_centimes" INTEGER NOT NULL DEFAULT 0,
        "label" VARCHAR(100) NOT NULL DEFAULT 'Frais de port France métropolitaine',
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ("id" = 1)
      );
    `);
    // Seed la ligne par défaut si vide
    await prisma.$executeRawUnsafe(`
      INSERT INTO "boutique_shipping_settings" (id, fee_centimes, free_threshold_centimes, label, active)
      VALUES (1, 590, 0, 'Frais de port France métropolitaine', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ajout colonne frais_port_centimes sur boutique_commandes (snapshot au moment de la création)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "boutique_commandes"
        ADD COLUMN IF NOT EXISTS "shipping_centimes" INTEGER NOT NULL DEFAULT 0;
    `);

    // === Boutique : grammage produit (g) pour calcul frais de port par poids ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "boutique_produits"
        ADD COLUMN IF NOT EXISTS "weight_grams" INTEGER NOT NULL DEFAULT 0;
    `);

    // === Stripe : table d'idempotence des webhooks ===
    // Stripe peut renvoyer le MÊME event plusieurs fois (retry réseau, replay).
    // Sans déduplication, on risque double crédit SMS, double upgrade de plan,
    // etc. Cette table garde la trace des event.id déjà traités.
    // TTL informel : on peut purger > 30 jours en cron plus tard.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "stripe_processed_events" (
        "event_id" VARCHAR(255) PRIMARY KEY,
        "event_type" VARCHAR(100) NOT NULL,
        "processed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_stripe_processed_events_at"
        ON "stripe_processed_events" ("processed_at" DESC);
    `);

    // === Boutique : tiers Colissimo (paliers tarifaires par tranche de poids) ===
    // Chaque ligne = un palier "jusqu'à max_grams → fee_centimes".
    // Le calcul prend le 1er tier dont max_grams ≥ poids_total_panier.
    // Si poids_total > tous les max_grams → on prend le dernier tier (le plus lourd).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "boutique_shipping_tiers" (
        "id" BIGSERIAL PRIMARY KEY,
        "max_grams" INTEGER NOT NULL,
        "fee_centimes" INTEGER NOT NULL,
        "label" VARCHAR(100) NOT NULL DEFAULT '',
        "position" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_boutique_shipping_tiers_max"
        ON "boutique_shipping_tiers" ("max_grams");
    `);
    // Seed des tiers Colissimo France métropolitaine si la table est vide.
    // === Archive locale des factures (obligation comptable 10 ans) ===
    // Snapshot de chaque facture émise (abo / SMS / boutique). Garantit une
    // trace locale même si Stripe a un souci, audit comptable rapide via SQL,
    // backup des URLs PDF Stripe + key R2 si on télécharge le PDF.
    //
    // Note : chaque CREATE TABLE / CREATE INDEX dans un appel séparé car
    // Postgres prepared statements n'acceptent qu'une seule commande SQL
    // par $executeRawUnsafe (erreur 42601 sinon).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "invoices_archive" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "restaurant_id" BIGINT,
        "type" VARCHAR(20) NOT NULL,
        "stripe_invoice_id" VARCHAR(255),
        "stripe_session_id" VARCHAR(255),
        "stripe_payment_intent_id" VARCHAR(255),
        "stripe_customer_id" VARCHAR(255),
        "invoice_number" VARCHAR(50),
        "amount_paid_centimes" INTEGER NOT NULL DEFAULT 0,
        "amount_due_centimes" INTEGER NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
        "status" VARCHAR(20) NOT NULL DEFAULT 'paid',
        "description" TEXT,
        "hosted_invoice_url" TEXT,
        "invoice_pdf_url" TEXT,
        "r2_pdf_key" TEXT,
        "issued_at" TIMESTAMPTZ,
        "paid_at" TIMESTAMPTZ,
        "metadata_json" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_archive_stripe_invoice"
        ON "invoices_archive" ("stripe_invoice_id")
        WHERE "stripe_invoice_id" IS NOT NULL;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_archive_stripe_session"
        ON "invoices_archive" ("stripe_session_id")
        WHERE "stripe_session_id" IS NOT NULL;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_archive_user"
        ON "invoices_archive" ("user_id", "paid_at" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_archive_type"
        ON "invoices_archive" ("type", "paid_at" DESC);
    `);

    // === Tarifs officiels Colissimo France métropolitaine avec livraison
    // à domicile, applicables au 01/04/2026 (cf. cahier tarifaire La Poste
    // particuliers). Reflète exactement la grille 9 paliers de l'opérateur.
    // L'admin peut modifier ensuite via /admin/boutique → Frais de port.
    await prisma.$executeRawUnsafe(`
      INSERT INTO "boutique_shipping_tiers" (max_grams, fee_centimes, label, position)
      SELECT * FROM (VALUES
        (250,    549, 'Jusqu''à 250 g',     1),
        (500,    759, 'Jusqu''à 500 g',     2),
        (750,    929, 'Jusqu''à 750 g',     3),
        (1000,   959, 'Jusqu''à 1 kg',      4),
        (2000,  1119, 'Jusqu''à 2 kg',      5),
        (5000,  1739, 'Jusqu''à 5 kg',      6),
        (10000, 2529, 'Jusqu''à 10 kg',     7),
        (15000, 3199, 'Jusqu''à 15 kg',     8),
        (30000, 3959, 'Jusqu''à 30 kg',     9)
      ) AS seed(max_grams, fee_centimes, label, position)
      WHERE NOT EXISTS (SELECT 1 FROM "boutique_shipping_tiers" LIMIT 1);
    `);

    // === Migration tarifs Colissimo 2026 ===
    // Met à jour les paliers EXISTANTS qui correspondent encore aux anciens
    // prix par défaut (issu du seed 2024). Si l'admin a customisé un palier
    // (fee différent de l'ancienne valeur par défaut), on respecte sa
    // modification et on ne touche pas.
    // Mapping : max_grams → (ancien_fee_centimes, nouveau_fee_centimes_2026)
    const colissimo2026Migration: Array<[number, number, number]> = [
      [250, 515, 549],
      [500, 695, 759],
      [750, 830, 929],
      [1000, 940, 959],
      [2000, 1090, 1119],
      [5000, 1480, 1739],
      [10000, 1840, 2529],
      [15000, 2510, 3199],
      [30000, 3230, 3959],
    ];
    for (const [maxGrams, oldFee, newFee] of colissimo2026Migration) {
      await prisma.$executeRawUnsafe(
        `UPDATE "boutique_shipping_tiers"
         SET fee_centimes = $1
         WHERE max_grams = $2 AND fee_centimes = $3`,
        newFee,
        maxGrams,
        oldFee,
      );
    }

    // === Outreach pipeline (campagne cold email 2000+ prospects) ===
    // 3 tables : prospect_restaurants, outreach_events, email_variants.
    // Cf. prisma/migrations/20260515160000_outreach_prospects/migration.sql
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "prospect_restaurants" (
        "id" BIGSERIAL PRIMARY KEY,
        "source" VARCHAR(50) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "nom" VARCHAR(255) NOT NULL,
        "ville" VARCHAR(120),
        "code_postal" VARCHAR(20),
        "adresse" TEXT,
        "telephone" VARCHAR(30),
        "site_web" TEXT,
        "rating" DOUBLE PRECISION,
        "nb_reviews" INTEGER,
        "niveau_prix" VARCHAR(10),
        "photo_cover" TEXT,
        "google_place_id" VARCHAR(120),
        "logo_url" TEXT,
        "couleur_dominante" VARCHAR(20),
        "menu_source_url" TEXT,
        "menu_source_type" VARCHAR(10),
        "card_json" JSONB,
        "card_token" VARCHAR(40),
        "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
        "enriched_at" TIMESTAMPTZ,
        "generated_at" TIMESTAMPTZ,
        "sent_at" TIMESTAMPTZ,
        "opened_at" TIMESTAMPTZ,
        "clicked_at" TIMESTAMPTZ,
        "converted_at" TIMESTAMPTZ,
        "error_message" TEXT,
        "email_variant" VARCHAR(10),
        "followup_count" INTEGER NOT NULL DEFAULT 0,
        "restaurant_id" BIGINT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Indexes séparés (sinon erreur 42601 sur multiple commands).
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "prospect_restaurants_email_key"
        ON "prospect_restaurants" ("email");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "prospect_restaurants_card_token_key"
        ON "prospect_restaurants" ("card_token");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_prospect_status"
        ON "prospect_restaurants" ("status");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_prospect_source"
        ON "prospect_restaurants" ("source");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_prospect_token"
        ON "prospect_restaurants" ("card_token");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_prospect_ville"
        ON "prospect_restaurants" ("ville");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "outreach_events" (
        "id" BIGSERIAL PRIMARY KEY,
        "prospect_id" BIGINT NOT NULL,
        "type" VARCHAR(20) NOT NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "outreach_events_prospect_fk"
          FOREIGN KEY ("prospect_id")
          REFERENCES "prospect_restaurants" ("id")
          ON DELETE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_outreach_prospect_type"
        ON "outreach_events" ("prospect_id", "type");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_outreach_created"
        ON "outreach_events" ("created_at");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "email_variants" (
        "id" BIGSERIAL PRIMARY KEY,
        "campaign" VARCHAR(50) NOT NULL,
        "step" INTEGER NOT NULL,
        "variant" VARCHAR(5) NOT NULL,
        "subject" VARCHAR(255) NOT NULL,
        "body_html" TEXT NOT NULL,
        "generated_by" VARCHAR(10) NOT NULL DEFAULT 'ai',
        "sent" INTEGER NOT NULL DEFAULT 0,
        "opened" INTEGER NOT NULL DEFAULT 0,
        "clicked" INTEGER NOT NULL DEFAULT 0,
        "replied" INTEGER NOT NULL DEFAULT 0,
        "converted" INTEGER NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_email_variant"
        ON "email_variants" ("campaign", "step", "variant");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_email_variant_active"
        ON "email_variants" ("campaign", "active");
    `);

    // === Catégories — créneaux d'affichage (lunch/dinner/happy_hour/custom) ===
    // Colonnes ajoutées tardivement, certains environnements ne les ont pas.
    // Cf. modèle Categorie dans schema.prisma + lib/schedule.ts pour la logique.
    // SANS ces colonnes, le mode "Créneau personnalisé" plante silencieusement
    // (le UPDATE Prisma fail mais l'UI affiche un succès sans rien sauvegarder).
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
        ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567',
        ADD COLUMN IF NOT EXISTS "couleur" VARCHAR(7);
    `);

    // === Produits — créneaux d'affichage (idem catégories) ===
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "produits"
        ADD COLUMN IF NOT EXISTS "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'always',
        ADD COLUMN IF NOT EXISTS "schedule_start" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_end" VARCHAR(5),
        ADD COLUMN IF NOT EXISTS "schedule_days" VARCHAR(7) NOT NULL DEFAULT '1234567';
    `);

    // === Restaurant — timezone IANA pour calcul créneaux ===
    // Default Europe/Paris. Permet aux restos NZ, USA, Asie, etc. d'avoir
    // leurs créneaux happy hour/midi/soir calculés dans LEUR fuseau horaire.
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris';
    `);

    // === Panel auto-translate cache ===
    // Cache à vie des traductions du panel client/admin (sidebar, pages,
    // formulaires, etc.). Quand un user change la lang vers EN/ES/etc., le
    // composant <T> appelle translatePanelString() qui :
    //  1. Check ce cache → si miss → Anthropic Haiku → cache
    //  2. Tous les users de la même lang bénéficient du même cache
    // Hash SHA-256 pour gérer les longs textes (PK contrainte 1500 octets).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "panel_translations_cache" (
        "text_hash" CHAR(64) NOT NULL,
        "lang" VARCHAR(2) NOT NULL,
        "source_text" TEXT NOT NULL,
        "translated" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("text_hash", "lang")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_panel_trad_created"
        ON "panel_translations_cache" ("created_at");
    `);

    runtimeSchemaEnsured = true;
  } catch (err) {
    console.warn(
      "[ensureRuntimeSchema] failed (the migration may still apply via prisma migrate deploy):",
      err,
    );
  }
}
