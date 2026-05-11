-- Plan offert par l'admin (bypass Stripe) : permet à l'admin d'offrir N
-- jours de Pro/Premium gratuitement à un restaurateur (commercial, démo,
-- compensation après bug, etc.).
--
--   - planOffertExpiresAt : date d'expiration du cadeau. Si > now, le plan
--     Pro/Premium reste actif même sans abonnement Stripe.
--   - planOffertByUserId : ID de l'admin qui a accordé le cadeau (audit).

ALTER TABLE "restaurants"
  ADD COLUMN "plan_offert_expires_at"   TIMESTAMPTZ,
  ADD COLUMN "plan_offert_by_user_id"   INTEGER;
