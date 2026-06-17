# 🌐 Audit — Système de langue par défaut + traduction

Exploration de bout en bout (auth, settings, carte publique, pipeline de
traduction) avant toute modification. Décisions utilisateur intégrées :
**langue du navigateur prioritaire si disponible** (BUG 1).

---

## Tableau de synthèse

| Bug | Fichiers touchés | Cause racine | Fix appliqué | Statut |
|-----|------------------|--------------|--------------|--------|
| **1 — Carte langue par défaut** | `src/app/carte/[id]/page.tsx` | Aucune. La résolution `?lang=` › Accept-Language › `langue_native` › fr est **déjà** celle demandée (navigateur prioritaire). Le symptôme « pas la bonne langue » était en fait le BUG 4 (contenu non traduit → fallback langue source). | **Aucun changement** (comportement déjà conforme à ton choix). Pas de migration DB. | ✅ (déjà OK) |
| **2 — Paramètre langue dashboard** | `src/app/dashboard/restaurant/restaurant-form.tsx`, `src/server/dashboard/actions.ts` | Aucune. Le sélecteur « Langue de saisie de la carte » (= langue par défaut) existe déjà : 7 langues, persisté via Prisma + fallback SQL. `langue_native` joue le rôle de `default_language` (pas de champ dupliqué nécessaire). | **Aucun changement** (fonctionnel). | ✅ (déjà OK) |
| **3 — Création de compte** | `src/lib/country-language.ts`, `src/app/(auth)/signup/signup-form.tsx`, `src/lib/auth.ts` | Signup email pré-réglé sur **FR** par défaut ; signup **Google** créait le User sans `langueNative` → toujours « fr ». | `navigator.language` pré-sélectionne le pays à l'inscription ; hook OAuth lit `Accept-Language` → pose `langueNative`. `langueNative` jamais NULL (default `"fr"`). | ✅ |
| **4 — Traduction produits (panel)** | `src/server/dashboard/translation-actions.ts`, `src/lib/plans.ts`, `src/app/api/diag/route.ts` | **Cause racine confirmée** : le bouton « Re-traduire » déléguait à **Inngest** et renvoyait un succès optimiste (« dispo dans 1-2 min ») sans vérifier que le worker traite l'event. En prod, si l'app Inngest n'est pas enregistrée → event dans le vide, toast « lancée » mais **aucune** traduction. Cause secondaire : le bouton était gaté Pro+. | (a) Bouton **toujours synchrone** → traduit en direct, renvoie les vrais compteurs. (b) Traduction **dégatée pour tous les plans** (`iaTranslation: true` en freemium). (c) Diagnostic `/api/diag?transtest=1`. | ✅ |
| **4 — Traduction produits (carte)** | `src/app/carte/[id]/page.tsx` (existant) | La carte lit bien `produit_translations`/`categorie_translations` filtrées par `lang`, avec fallback langue source si trad absente + **auto-heal** en arrière-plan (déjà présent, non gaté). Si rien ne se traduit → la traduction n'aboutit jamais (clé) ou Anthropic garde le mot tel quel (ex: « Desserts » est un mot allemand valide). | Diagnostic ci-dessus. Pas de bug de lecture identifié. | 🟡 à confirmer via diag |

---

## 🔬 Étape décisive pour le BUG 4 (à faire en prod)

Connecté en **admin** sur ruliz-panel.fr, ouvre :

```
https://ruliz-panel.fr/api/diag?transtest=1
```

Regarde le bloc `transTest` :

| Résultat | Interprétation | Action |
|----------|----------------|--------|
| `services.anthropic: false` | La clé n'est **pas** dans Railway | Ajouter `ANTHROPIC_API_KEY` dans Railway → Variables, redéployer |
| `transTest.ok: false` (erreur 401/permission) | Clé présente mais **invalide/expirée** | Régénérer la clé Anthropic, la remettre dans Railway |
| `transTest.ok: true` avec p.ex. `Desserts→de = "Nachtische"` | Le pipeline **marche** | Le souci est de la **donnée périmée** côté resto → re-traduire (voir ci-dessous) |
| `transTest.ok: true` avec `Desserts→de = "Desserts"` | Anthropic garde « Desserts » (mot allemand valide) | Pas un bug ; on peut durcir le prompt pour les catégories si tu veux du 100 % traduit |

---

## ✅ Décision gating (tranchée)

La traduction IA est désormais **accessible à tous les plans** (freemium
inclus) — choix validé. Un seul changement dans `PLAN_FEATURES` (`iaTranslation:
true` en freemium) qui cascade partout : le gate passe pour tous, et la
comparaison de prix + bullets marketing l'affichent pour le freemium. Cohérent
avec la promesse cœur de Ruliz (cartes multilingues) et avec l'auto-traduction
qui n'était déjà pas gatée.

---

## 📌 Bonus — Site vitrine

Le site vitrine marketing (`/`) et le mini-site restaurant (`/site/[id]`)
ont leur propre système de traduction (auto-translate, exploré en sessions
précédentes). Hors scope de cette passe ; aucun changement. État : cohérent
avec `SUPPORTED_LANGS` (mêmes 7 langues).

---

## Récap commits

| Commit | Sujet |
|--------|-------|
| `feat(diag)` | test de traduction Anthropic en direct (`?transtest=1`) |
| `fix(auth)` | langue de la carte détectée du navigateur à l'inscription (email + Google) |
