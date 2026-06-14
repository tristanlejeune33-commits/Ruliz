# 🔍 Audit Ruliz V2 — Rapport de correction

Audit complet + correction de bugs sur l'app de production **ruliz-panel.fr**.
Méthode : une anomalie = une investigation = un fix isolé = un commit atomique.
`tsc --noEmit` après chaque groupe. Push direct sur `main` (Railway redéploie).

Branche de travail : `fix-form-field` → `origin/main`.

---

## P1 — Bugs bloquants (8/8 corrigés)

| # | Item | Cause racine | Fix | Fichiers | Statut |
|---|------|--------------|-----|----------|--------|
| 1.1 | Sélecteur de langue du panel SaaS ne traduisait pas tout | 3 défauts cumulés : portals Radix hors du scope scanné, mutations `characterData` ignorées, table cache de trad non garantie | Scan sur `document.body`, observer `characterData:true` + flag anti-boucle, `ensureRuntimeSchema()` avant lookup cache | `auto-translate-wrapper.tsx`, `translate-panel-actions.ts` | ✅ |
| 1.2 | Auto-save onboarding perdait l'étape | Persistance bloquante, pas de retry, navigation avant save | `persistStep` non-bloquant + 1 retry, indicateur `aria-live`, navigation avant persistance | `onboarding-bubble.tsx` | ✅ |
| 1.3 | Devise par défaut non appliquée aux nouveaux plats | `deviseDefault` du resto jamais propagé à l'éditeur ni au rendu public | Propagation `deviseDefault` (éditeur → dialog produit, rendu public, import) | `menu/page.tsx`, `ProduitDialog`, `menu.ts`, `menu-import-actions.ts`, +1 | ✅ |
| 1.4 | Conditions des plans non appliquées (tout en premium) | Gating jamais branché + trial jamais expiré (colonne `plan` figée) | `getEffectivePlan()` (Stripe > période > offerte > freemium), `assertFeature`/`assertWithinLimit` sur les server actions | `plan-gate.ts`, `jeu/popup/sms/translation/qrcode/menu-actions.ts` | ✅ |
| 1.5 | Upload d'une 2ᵉ carte/restaurant impossible | Pas d'entrée UI pour créer un resto additionnel | `AddRestaurantDialog` (réutilise `createFirstRestaurant` qui gère les limites) | `restaurant-switcher.tsx` | ✅ |
| 1.6 | Compteur de catégories faux au dashboard | Filtre `parentId: null` excluait les sous-catégories | `count` sans le filtre `parentId` | `dashboard/page.tsx` | ✅ |
| 1.7 | Titres de plats non traduits | Prompt Anthropic trop conservateur (gardait le FR) | Prompt réécrit : « TRANSLATE dish names », exceptions explicites (foie gras, appellations) | `anthropic.ts` | ✅ |
| 1.8 | Mauvaise langue par défaut sur la carte publique | Résolution langue incomplète | `?lang=` > Accept-Language > `langue_native` resto > fr | `carte/[id]/page.tsx` | ✅ |

---

## P2 — Responsive carte publique (validé avec l'utilisateur)

| # | Item | Décision | Fix | Fichiers | Statut |
|---|------|----------|-----|----------|--------|
| 2.1 | Boutons « Voir la carte » | « check les 2 » | Zones de tap ≥ 44px (Apple HIG / WCAG 2.5.5) sur `.rs2-btn`, `.rs2-map-cta`, `.rs2-float-cta` | `restaurant-site-v2/styles.css` | ✅ |
| 2.2 | Catégories en grille | **Refusé** par l'utilisateur — garder le scroll horizontal | — | — | ⏭️ |
| 2.3 | Bottom nav « 1 tap sur 2 » | Bug Vaul (`pointer-events:none` non nettoyé à la fermeture pendant une navigation) | Cleanup forcé après l'animation | `ui/bottom-sheet.tsx` | ✅ |
| 2.4 | Détail produit (sheet) | Améliorer sans refondre | Swipe-down pour fermer (drag proxy : poignée immobile pilotant la translation Y), tap extérieur déjà OK | `carte/[id]/produit-sheet.tsx` | ✅ |

---

## P3 — UX & features

| # | Item | Décision | Fix | Fichiers | Statut |
|---|------|----------|-----|----------|--------|
| 3.1 | Connexion Google | Implémenté | Better-Auth `socialProviders.google` (actif si credentials), hook `user.create.after` crée le User métier role=client, bouton « Continuer avec Google » sur login + signup | `auth.ts`, `google-button.tsx`, `login-form.tsx`, `signup-form.tsx`, `.env.example` | ✅ |
| 3.2 | Horaires service continu | Implémenté | Toggle par jour « Midi + Soir » / « Service continu » (plage unique dans `midi`, soir=null), champ `continu?` optionnel + Zod | `horaires-service.ts`, `restaurant-form.tsx`, `dashboard/actions.ts` | ✅ |
| 3.3 | Dashboard mode édition | Délégué (« fait comme tu le sens ») | Mode « Personnaliser » : réordonner (dnd-kit) + masquer les sections, persisté par user (`dashboardLayout`) | `dashboard-customizer.tsx`, `dashboard/page.tsx`, `dashboard-layout-actions.ts`, schéma | ✅ |
| 3.4 | Page QR codes | Délégué (« comme tu veux ») | Libellé nommable par QR (édition inline) + page d'impression A4 print-friendly | `qrcode-actions.ts`, `qrcodes-view.tsx`, `qrcodes/print/*`, schéma | ✅ |
| 3.5 | Upload PDF de carte | **Reporté** (« pas prioritaire ») | — | — | ⏭️ V2 |
| 3.6 | Header éditeur surchargé | Implémenté | Masque le bouton « Importer » du header quand le banner cold-start porte déjà ce CTA (plus de double CTA primaire) | `menu/page.tsx` | ✅ |
| 3.7 | Roulette UX | Implémenté | Countdown 10s→5s, prénom+nom sur une ligne, date de naissance marquée facultative | `carte/[id]/roulette.tsx` | ✅ |
| 3.8 | Conflits popups | Implémenté | Auto-popup roulette supprimé si un popup événement est actif (priorité au popup planifié) + garde-fou anti-superposition avec le détail produit | `carte/[id]/carte-public.tsx` | ✅ |
| 3.9 | Revue des Plans | Implémenté | UI alignée sur le plan effectif : PlanLock (jeu/popups/sms) + badges consomment `getEffectivePlan()` au lieu de `restaurant.plan` brut | `plan-lock` callers, `billing/restaurant/settings/dashboard/page.tsx` | ✅ |

---

## ⚠️ Points nécessitant une décision

1. **Marketing « Restaurants illimités » pour Pro** — *non, faux positif de l'audit.*
   Vérification faite : `bulletPoints()` affiche bien « 3 restaurants » pour Pro
   (seul `null` → « illimités », réservé à Premium). La matrice est cohérente.

2. **`advancedStats` non gatée** — la page `/dashboard/stats` est accessible à
   tous les plans (freemium inclus), alors que la matrice déclare
   `advancedStats` en Pro+. **Décision attendue** : faut-il verrouiller toute la
   page stats en freemium (régression d'accès pour les comptes existants) ou
   seulement les sections « avancées » (heatmap, langues, top produits) ? Non
   modifié pour ne pas retirer un accès dont disposent déjà des comptes.

3. **`customDomain`** — feature « fantôme » : déclarée dans la matrice Premium
   mais sans colonne DB ni UI ni routage. À implémenter ou retirer de la
   matrice/marketing en V2.

4. **Cartes internes de Facturation** — `SubscriptionStatusCard`,
   `BillingActions` et `PlanCard` gardent volontairement `restaurant.plan` brut
   (et non le plan effectif) : ce sont les surfaces de gestion d'abonnement, qui
   affichent le contexte Stripe complet (statut, période). À confirmer.

---

## 🔍 Bugs / dettes découverts en cours d'audit

1. **Colonnes runtime non déclarées dans `schema.prisma`** — plusieurs colonnes
   ajoutées uniquement via `ensureRuntimeSchema()` (`langueNative`, `lunchStart`,
   `dinnerStart`, `autoPopup`, `clicCount`, champs Google reviews, etc.) ne sont
   pas dans les modèles Prisma → ~80 erreurs `tsc --noEmit` préexistantes (le
   build Railway régénère un client qui ne les connaît pas non plus pour ces
   accès). Aucune n'est dans les fichiers modifiés par cet audit. **Recommandé
   V2** : déclarer ces colonnes dans `schema.prisma` (avec `@map`) pour
   retrouver la sécurité de typage et un `tsc` propre.

2. **Gating serveur partiel sur certaines features** — `rouletteGame`, `popups`,
   `smsMarketing` sont désormais gatées côté action (P1) ; `advancedStats` reste
   sans gating serveur (cf. décision #2).

3. **PNG QR orphelins sur R2** — `deleteQrcode` supprime la ligne mais pas le PNG
   sur R2 (commentaire déjà présent dans le code). Nettoyage best-effort à
   prévoir en V2 (cron ou suppression à la volée).

---

## 📋 Reste à faire / V2

- **3.5 Upload PDF de carte** (reporté) — V1 viewer : colonne `cartePdfUrl`,
  extension `/api/upload-direct` au MIME `application/pdf`, `PdfUploader`, bouton
  viewer sur la carte publique. V2 : parsing PDF→produits (à chiffrer).
- Déclarer les colonnes runtime dans `schema.prisma` (cf. dette #1).
- Décision puis implémentation du gating `advancedStats` (#2).
- Implémenter ou retirer `customDomain` (#3).
- Nettoyage des PNG QR orphelins sur R2 (#3 dettes).

---

## ✅ Récapitulatif des commits (P3)

| Commit | Sujet |
|--------|-------|
| `fix(roulette)` | UX allégée — countdown 5s + formulaire plus court |
| `feat(qrcodes)` | nommer chaque QR + page d'impression |
| `feat(auth)` | connexion Google OAuth (login + signup) |
| `feat(horaires)` | mode service continu |
| `fix(carte)` | plus de conflit popup événement / roulette |
| `fix(plans)` | UI cohérente avec le plan effectif |
| `fix(menu)` | header éditeur allégé |
| `feat(dashboard)` | mode personnaliser (réordonner + masquer sections) |

_Vérification : `tsc --noEmit` — aucune nouvelle erreur dans les fichiers
touchés ; les erreurs restantes sont la dette préexistante des colonnes runtime
(#1)._
