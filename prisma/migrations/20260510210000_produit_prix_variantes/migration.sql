-- Variantes de prix pour produits multi-volumes / multi-tailles.
--
-- Cas d'usage :
--   - Bière : Demi 3.50€ · Pinte 6.50€ · Pichet 1L 12€
--   - Vin : Verre 12cl 5€ · Verre 25cl 9€ · Bouteille 75cl 28€
--   - Planche : Petite 12€ · Grande 24€
--
-- Format JSON : [{"label": "Demi", "prix": 3.50}, ...]
-- null ou tableau vide = fallback sur le champ `prix` simple (rétrocompat).

ALTER TABLE "produits"
  ADD COLUMN "prix_variantes" JSONB;
