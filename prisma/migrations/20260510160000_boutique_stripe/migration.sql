-- Câblage Stripe sur la boutique :
--   - boutique_produits : sync auto vers Stripe (Product + Price)
--   - boutique_commandes : suivi du paiement Stripe (Checkout Session +
--     Payment Intent + paidAt)

ALTER TABLE "boutique_produits"
  ADD COLUMN "stripe_product_id" VARCHAR(100),
  ADD COLUMN "stripe_price_id"   VARCHAR(100);

ALTER TABLE "boutique_commandes"
  ADD COLUMN "stripe_checkout_session_id" VARCHAR(255),
  ADD COLUMN "stripe_payment_intent_id"   VARCHAR(100),
  ADD COLUMN "paid_at"                    TIMESTAMPTZ;
