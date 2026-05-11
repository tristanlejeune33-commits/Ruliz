-- Planning d'affichage des pop-ups : jours de la semaine + plage horaire
--
-- joursActifs : bitmap 7 bits (bit 0 = dimanche, bit 6 = samedi).
--   null  = tous les jours (comportement par défaut)
--   ex.   = (1<<2) | (1<<4) = 20 → uniquement mardi et jeudi
--
-- heureDebut / heureFin : strings "HH:MM" (24h).
--   null = toute la journée. Si l'un est défini, l'autre devrait l'être aussi.

ALTER TABLE "popups"
  ADD COLUMN "jours_actifs" INTEGER,
  ADD COLUMN "heure_debut"  VARCHAR(5),
  ADD COLUMN "heure_fin"    VARCHAR(5);
