# 🧪 Testing — Suite E2E Ruliz

Tests automatisés Playwright qui couvrent **toute la surface visible** de
Ruliz : routes publiques, parcours auth, carte publique mobile, responsive,
accessibilité, et régression visuelle.

## Quick start

### Une fois (setup local)
```bash
pnpm install
pnpm test:e2e:install   # installe Chromium pour Playwright (~150 MB)
```

### Au quotidien
```bash
pnpm test:e2e                          # tous les tests
pnpm test:e2e:ui                       # mode UI interactif (debug)
pnpm test:e2e:headed                   # voir le navigateur tourner
pnpm test:e2e:report                   # ouvrir le dernier rapport HTML
```

### Filtrer un seul fichier
```bash
pnpm test:e2e tests/e2e/smoke.spec.ts
pnpm test:e2e -- --grep "carte publique"
```

### Tester une autre URL
```bash
BASE_URL=http://localhost:3000 pnpm test:e2e
BASE_URL=https://staging.ruliz-panel.fr pnpm test:e2e
```

---

## 🎯 Couverture

### Routes publiques (`tests/e2e/smoke.spec.ts`)
- Toutes les pages publiques retournent 200
- API `/api/health` répond
- Headers de sécurité (CSP, HTTPS) présents
- 404 sur routes/cartes/tokens inexistants

### Carte publique (`tests/e2e/carte-publique.spec.ts`)
- Rendu de base sur les IDs définis (par défaut 3 et 4)
- 7 langues testées (FR/EN/ES/DE/IT/PT/ZH)
- Performance < 3s `domcontentloaded`, < 5s `networkidle`
- Pas d'erreur console critique
- Pas de NaN / undefined / null visibles
- Toutes les images ont un `alt`

### Auth flow (`tests/e2e/auth-flow.spec.ts`)
- Login, signup, forgot-password : UI complète
- Validation : email invalide bloque le submit
- Routes protégées (`/dashboard`, `/admin`) redirigent vers login

### Responsive (`tests/e2e/responsive.spec.ts`)
- 5 viewports testés : iPhone SE / iPhone 14 / iPad Mini / Desktop / 4K
- Pas de scroll horizontal
- Texte ≥ 12px sur mobile
- Navigation accessible

### Visual regression (`tests/e2e/visual.spec.ts`)
- 7 pages screenshotées (landing, pricing, login, signup, forgot, legal, carte)
- Comparaison pixel-perfect au prochain run
- Tolérance 0.02% pour absorber subpixel rendering

### Accessibilité (`tests/e2e/accessibility.spec.ts`)
- Scan **axe-core** WCAG 2.1 AA
- Fail si violation `critical` ou `serious` détectée
- Vérifie : navigation clavier, structure heading, boutons nommés
- Log les violations mineures sans fail

### Outreach (`tests/e2e/outreach.spec.ts`)
- Routes admin `/admin/outreach/*` protégées
- Webhook `/api/outreach/event` : sécurité token + validation JSON

---

## 🤖 CI GitHub Actions

Le workflow `.github/workflows/e2e.yml` lance les tests automatiquement :

- **À chaque push sur `main`** → tests exécutés
- **À chaque PR** → tests exécutés
- **Manuellement** via "Actions" tab → "Run workflow"
  - Option : choisir une autre `BASE_URL`
  - Option : filtrer les tests (ex: `smoke` ou `visual`)

### Voir les résultats
1. Va sur **github.com/tristanlejeune33-commits/Ruliz**
2. Onglet **Actions**
3. Click sur le dernier run "E2E Tests"
4. Voir le résumé + télécharger `playwright-report-combined` pour le rapport HTML détaillé

### En cas d'échec
- Le rapport HTML inclut les screenshots automatiques au moment du fail
- Les vidéos sont conservées 14 jours (artefact `test-failures-shard-X`)
- Trace Playwright permet de rejouer le scénario complet

---

## 🖼️ Tests visuels — première utilisation

Au premier run, les screenshots de référence n'existent pas. Il faut les générer :

```bash
# Génère les images de référence
pnpm test:e2e -- visual --update-snapshots

# Commit les références
git add tests/e2e/visual.spec.ts-snapshots/
git commit -m "test: snapshots visuels initiaux"
git push
```

**Désormais**, à chaque modification du design, si une page change :
- Le test échoue avec une **image diff** côte-à-côte
- Si le changement est voulu : `pnpm test:e2e -- visual --update-snapshots` puis commit
- Si c'est un bug : tu vois exactement où ça a changé

---

## 🎬 Debug — un test échoue

### En local
```bash
# Mode UI (recommandé) : voit chaque étape, peut pauser, inspecter
pnpm test:e2e:ui

# Mode headed : voit le navigateur en direct
pnpm test:e2e:headed -- tests/e2e/smoke.spec.ts

# Mode trace : génère une trace timestampée
pnpm test:e2e -- --trace on
pnpm exec playwright show-trace trace.zip
```

### En CI
1. Va sur le workflow run failed
2. Télécharge `test-failures-shard-X`
3. Ouvre `index.html` du report
4. Clique sur le test failed → vois screenshot + trace + video

---

## ⚙️ Configuration

### `playwright.config.ts`
- Timeout par test : 60s
- Workers : 4 en local, 2 en CI
- Retries : 0 en local, 2 en CI
- Locale FR + timezone Paris (matche les textes)
- User-Agent identifiable `RulizE2E/1.0`

### Projets Playwright
- `chromium-desktop` : tous les tests (1280x720)
- `chromium-mobile` : carte-publique + responsive + visual (iPhone 14)
- `chromium-tablet` : responsive (iPad Mini)

---

## 📊 Métriques attendues

| Métrique | Cible | Action si dépassée |
|---|---|---|
| Total tests | ~60-80 | Croît avec le projet |
| Durée run complet | < 5 min en CI | Optimiser sharding |
| Tests flaky | 0 | Ajouter `waitForLoadState("networkidle")` |
| Couverture routes | 100% des publiques | Ajouter dans `smoke.spec.ts` |
| Violations a11y | 0 critical/serious | Fix avant merge |

---

## 🆕 Ajouter un nouveau test

### Pattern minimal
```typescript
import { test, expect } from "@playwright/test";

test("Mon nouveau test", async ({ page }) => {
  await page.goto("/ma-route");
  await expect(page.locator("h1")).toBeVisible();
});
```

### Pour les routes auth-protected
Pas encore d'authentification dans la suite (pour éviter de polluer la prod
avec des comptes test). Pour ajouter ça plus tard :

1. Créer un compte de test dédié (ex: `e2e@ruliz-panel.fr`)
2. Ajouter dans `playwright.config.ts` un `globalSetup` qui se logge et stocke le cookie
3. Utiliser `test.use({ storageState: "auth.json" })` dans les fichiers concernés

Cf. [docs Playwright auth](https://playwright.dev/docs/auth).

---

## 🚨 Tests qui peuvent échouer "normalement"

### Visual regression au 1er run
**Cause** : pas de snapshots de référence.
**Fix** : `pnpm test:e2e -- visual --update-snapshots` une fois.

### Carte ID 3/4 inexistante en local
**Cause** : ton seed local n'a peut-être pas les mêmes IDs que la prod.
**Fix** : `CARTE_IDS=1,2 pnpm test:e2e`.

### Accessibilité — violation moderate sur la landing
**Cause** : axe-core trouve un truc mineur (ex: contraste léger).
**Fix** : juste log informatif, le test passe quand même.

### Rate limit hit sur prod
**Cause** : trop de tests parallèles depuis la même IP CI.
**Fix** : déjà mitigé via `workers: 2` en CI + retries.

---

## 📚 Pour aller plus loin

- [Playwright docs](https://playwright.dev/docs/intro)
- [axe-core rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Web Content Accessibility Guidelines WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- Cf. `playwright.config.ts` pour tweaker
