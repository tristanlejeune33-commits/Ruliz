# 🧭 PROJECT_CONTEXT.md — État des lieux Ruliz

> Document produit par cartographie en **lecture seule** (reprise du projet sur un nouveau PC).
> Date de l'analyse : 2026-06-20. Aucune ligne de code n'a été modifiée.
>
> **À lire aussi** : `AGENT.md` (plan de vol courant, le plus à jour), `CLAUDE.md` (brief
> original + règles), `HANDOVER.md` (historique), `DISCOVERY.md` (décisions design phase 0).
> Ce fichier ajoute une **vérification factuelle du code réel** contre cette doc.

---

## 1. Résumé du projet

**Ruliz** = SaaS B2B français de **menus digitaux pour restaurants**. Le client d'un
restaurant scanne un QR code à table → accède à la carte sur mobile, traduite par IA
(Anthropic Haiku) en plusieurs langues, avec photos, allergènes, suggestions, et un jeu
roulette pour récolter des avis Google.

**4 surfaces produit** :
1. **Vitrine marketing** (`/`) — landing commerciale
2. **Back-office admin** (`/admin`) — Tristan, gestion globale des clients
3. **Dashboard client** (`/dashboard`) — le restaurateur gère resto, carte, QR, SMS, etc.
4. **Carte publique mobile** (`/carte/[id]`) — la surface scannée, critique en perf (ISR + Redis + edge)

**État réel constaté** : ce n'est **pas** un projet "from scratch" comme le suggère
`CLAUDE.md`. C'est une **application mature en production** (`https://ruliz-panel.fr` sur
Railway), Phase 7+. **381 fichiers TS/TSX, ~73 000 lignes** dans `src/`. Toutes les
phases 0→6 du brief sont livrées, plus un pipeline d'acquisition cold-email de 2000+
prospects et un constructeur de mini-site vitrine par restaurant (voir §6).

### Stack (vérifiée dans `package.json`)
| Couche | Techno | Version |
|---|---|---|
| Framework | Next.js (App Router) + React + TS strict | 15.5 / 19.2 / TS 6.x |
| Styling | Tailwind v4 + shadcn/ui (Radix) custom | 4.2 |
| ORM / DB | Prisma 6.19 / PostgreSQL | — |
| Auth | Better-Auth (cookies httpOnly, multi-rôle) | 1.6.9 |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` | 3.x |
| Paiements | Stripe | 22.1 |
| Emails | Resend | 6.12 |
| SMS | Brevo (API directe) | — |
| IA | Anthropic SDK (`claude-haiku-4-5-20251001`) | 0.95 |
| Cache | Redis (`ioredis`) + in-memory hybride | 5.10 |
| Jobs background | Inngest | 4.3 |
| Drag & drop | @dnd-kit | 6.3 |
| Forms / validation | React Hook Form + Zod 4 | — |
| Charts | Recharts | 3.8 |
| Tests E2E | Playwright (+ @axe-core a11y) | 1.49 |
| Package manager | pnpm | 11.0.8 (Node 22.x) |
| Hosting | Railway (App + Postgres + Redis) | — |

---

## 2. Architecture & conventions

### Arborescence `src/` (rôles)
```
src/
├── app/                  # Next.js App Router (routes + RSC)
│   ├── (marketing)/      # vitrine /, /pricing, /legal/*
│   ├── (auth)/           # login, signup, forgot-password, reset-password
│   ├── admin/            # back-office Tristan (clients, outreach, boutique, factures, demo, email-test…)
│   ├── dashboard/        # espace restaurateur (menu, restaurant, qrcodes, stats, sms, popups, jeu, site, team…)
│   ├── carte/[id]/       # ⭐ carte publique mobile ISR (perf critique)
│   ├── preview/[token]/  # page prospect cold-email (carte pré-générée)
│   ├── site/[id]/        # ⭐ mini-site vitrine public du resto (feature restaurant-site-v2)
│   ├── c/[code]/         # short URLs QR
│   └── api/              # health, stripe/webhook, inngest, outreach/event, upload, diag, auth
├── components/
│   ├── ui/               # ~25 primitives shadcn customisées
│   ├── shared/           # ~30 composants métier (AppShell, Sidebar, Topbar, command-palette, banners…)
│   └── shell/            # layout mobile-first (bottom-nav, drawer)
├── features/             # modules métier autonomes
│   ├── onboarding/       # tour guidé première connexion
│   └── restaurant-site-v2/  # ⭐ builder mini-site vitrine (Hero, Navbar, Gallery, Lenis…)
├── lib/                  # ~38 utils infra (db, auth, redis, r2, stripe, email-template, schedule…)
├── server/              # server actions + queries, 1 dossier par scope (voir ci-dessous)
├── hooks/                # use-is-mobile, use-long-press, use-scroll-direction
├── types/                # globals.d.ts
└── middleware.ts         # auth gate /admin /dashboard + rate-limit /carte
```

### Couche `src/server/` (logique métier)
- `auth/` — login/signup, `getPostLoginUrl()` (redirect role-aware), clear cookies
- `billing/` — Stripe checkout subscriptions, `invoice-archive`
- `dashboard/` — actions restaurateur (menu, boutique panier/checkout, sms-packs…)
- `public/` — **carte publique** : `menu.ts` (cache Redis 30 min), `scan.ts` (dedup in-memory), `jeu-actions.ts`, `track-click.ts`, `restaurant-site-v2-loader.ts`
- `translation/` — `anthropic.ts` (wrapper SDK + system prompt) → `service.ts` (cache DB, idempotent)
- `outreach/` — pipeline cold-email : `enrich.ts`, `generate-card.ts` (Vision OCR), `validate-email.ts`, `activate-prospect.ts`, `ai-marketer.ts`, `csv-parser.ts`
- `inngest/` — `client.ts`, `functions.ts` (traduction, SMS), `outreach-functions.ts` (3 workers + cron)
- `boutique/`, `sms/`, `integrations/google-places.ts`

### Conventions observées (cohérentes avec AGENT.md)
- Code/fichiers en **anglais**, strings UI en **français**
- Tables DB **snake_case** → modèles Prisma PascalCase, champs camelCase via `@map`
- **Server Actions** privilégiées vs API routes (sauf webhooks externes & upload presigned)
- **Zod** sur tous les inputs ; **`serialize()`** obligatoire avant de passer du Prisma (BigInt) au client
- **Cookies httpOnly** only (jamais localStorage) ; cookies internes : `ruliz_active_restaurant`, `ruliz_impersonate_user_id`, `ruliz_admin_demo`
- TS **strict** + `noUncheckedIndexedAccess` + `noEmit` ; pas de `any`
- Jobs > 2 s → **Inngest** (BigInt sérialisé en string dans les events)
- Anti-drift schéma : **`ensureRuntimeSchema()`** (`ALTER TABLE … IF NOT EXISTS` au boot) plutôt que migration Prisma pour les ajouts de colonnes nullable

---

## 3. Schéma de données (40 modèles Prisma, `prisma/schema.prisma`, 1011 lignes)

**Auth (Better-Auth, séparé du métier)** : `AuthUser`, `Session`, `Account`, `Verification`.
`AuthUser.userId` → 1-1 optionnel vers `User` métier. Rôle canonique = `users.role`.

**Cœur métier** :
- `User` (admin/client/team, statut, Stripe customer, onboarding, `dashboardLayout`)
- `TeamMember` (owner ↔ member)
- `Restaurant` (1 User → N restos ; 1 **abonnement Stripe par resto** ; branding, horaires lunch/dinner/happy-hour, thème carte publique, réseaux sociaux, timezone, langue native)
- `Qrcode` (codeUnique, pngUrl R2, compteurs scanTotal/scanMois)
- `Categorie` (auto-référence `parentId` pour sous-cats, mode liste/grille/carrousel, scheduling horaires + jours)
- `Produit` (prix simple ou `prixVariantes` JSON, vignettes, allergènes, suggestions, scheduling, clicCount)
- Pivots : `ProduitVignette`, `ProduitAllergene`, `ProduitSuggestion` (auto-relation produit↔produit) ; référentiels `Vignette`, `Allergene`
- Traduction : `ProduitTranslation` (PK composite `[produitId, lang]`), `CategorieTranslation` — **cache DB à vie**
- `Scan` (**partitionnée par date** en SQL natif, PK `[id, scannedAt]`), `Log`

**Engagement** : `Jeu` (roulette, auto-popup, config JSON), `JeuParticipation`, `Popup` (planning bitmap jours + plage horaire), `BaseClient` (RGPD opt-in SMS, anniversaire).

**Boutique QR** : `BoutiqueProduit` (sync Stripe Product/Price), `BoutiqueCommande` (statuts, Stripe Checkout/PaymentIntent), `BoutiqueCommandeItem` (snapshot prix).

**SMS marketing** : `SmsBalance` (1/resto), `SmsCreditPurchase`, `SmsMessage`, `SmsCampaign`, `SmsPackSetting`, `SmsAutomation`.

**Outreach cold-email** : `ProspectRestaurant` (status `queued→enriched→generated→sent→…→converted`, `cardJson`, `cardToken`), `OutreachEvent`, `EmailVariant` (A/B + stats, contrainte unique `[campaign, step, variant]`).

**25 migrations** Prisma versionnées (`prisma/migrations/`, du 2026-05-08 init au 2026-05-15 outreach).

---

## 4. Flux clés (tracés fichier par fichier)

1. **Auth** : `middleware.ts` (gate `/admin` `/dashboard` via cookie Better-Auth) → `(auth)/login` → `lib/auth.ts` (config Better-Auth + Prisma adapter) → `server/auth/actions.ts` → `getPostLoginUrl()` redirige admin→`/admin`, client→`/dashboard`.
2. **Carte publique** (perf critique) : requête `/carte/[id]` → cache 4 niveaux *Cloudflare edge → ISR (revalidate 60) → Redis (`carte:{id}:{lang}`) → DB* via `server/public/menu.ts` ; tracking scan **non bloquant** (`waitUntil()` + dedup in-memory) dans `server/public/scan.ts`.
3. **Traduction IA** : save produit (dashboard) → event Inngest → `server/inngest/functions.ts` → `server/translation/service.ts` vérifie cache DB, sinon `anthropic.ts` (Haiku, `temperature 0.2`, `max_tokens 500`) → insert `ProduitTranslation` → invalide Redis/ISR. **Jamais d'appel Anthropic synchrone pendant un scan.**
4. **Paiement Stripe** : `server/billing/actions.ts` (checkout subscription, 1 abo/resto via `metadata.ruliz_restaurant_id`) ; webhook idempotent `/api/stripe/webhook` (table `stripe_processed_events`) ; boutique & SMS = Checkout one-shot. Customer Portal Stripe.
5. **Outreach** : upload CSV (`/admin/outreach`) → `server/admin/outreach-actions.ts` → workers Inngest `outreach-functions.ts` (enrich scrape → generate Vision OCR → `cardJson`) → email Smartlead avec `/preview/{token}` → CTA `/signup?prospect={token}` → `activate-prospect.ts` crée Restaurant + Categorie + Produit → traductions background. Tracking via webhook `/api/outreach/event`.

---

## 5. État du code

### ✅ Ce qui semble en place et cohérent
- Modèle de données complet et richement commenté (40 modèles, 25 migrations).
- Documentation interne **exceptionnelle** (`AGENT.md`, `HANDOVER.md`, `DISCOVERY.md`, `docs/`).
- Conventions respectées dans tout le code (Zod, serialize, server actions, httpOnly).
- CI GitHub Actions (`.github/workflows/ci.yml`) : install → `db:generate` → lint → typecheck → build. E2E Playwright (`e2e.yml`).
- Très peu de dette signalée : **27 marqueurs** TODO/FIXME/HACK/ts-ignore sur 20 fichiers seulement (sain pour 73k LOC).
- **`pnpm typecheck` (`tsc --noEmit`) → PASSE, 0 erreur.** C'est le garde-fou qui gate le déploiement (le typecheck n'est PAS ignoré au build).

### 🔴 Ce qui est cassé (vérifié le 2026-06-20)
- **`pnpm lint` échoue (exit 1) : 2 erreurs + 25 warnings.** Ces fichiers étant identiques à `origin/main`, le **step `Lint` de la CI GitHub est donc actuellement ROUGE sur `main`**.
  - 2 **erreurs** triviales `prefer-const` : `src/app/sitemap.ts:48` (`dynamicRoutes`) et `src/features/restaurant-site-v2/RestaurantSite.tsx:97` (`btnBg`).
  - 25 **warnings** = imports/variables inutilisés (`no-unused-vars`) + 3 directives `eslint-disable` devenues inutiles (`theme-toggle.tsx`, `rate-limit.ts`).
  - **Pourquoi la prod déploie quand même** : `next.config.ts` a `eslint.ignoreDuringBuilds: true` → `next build` (Railway) saute ESLint. Seul le typecheck gate le déploiement. Donc *aucun impact prod*, mais la CI GitHub reste rouge tant que ce n'est pas corrigé.
  - **Fix** : ~30 s via `pnpm lint --fix` (corrige les 2 erreurs + 3 warnings) ; le reste (unused vars) = nettoyage manuel rapide. **Non corrigé** (Phase 1/2 = lecture seule, en attente de feu vert).

### ✅ Environnement local — INSTALLÉ (2026-06-20)
Outillage mis en place sur la machine (Node n'était pas dispo en winget pour la 22.x → **ZIP portable**, sans droits admin) :
- **Node 22.19.0** (version exacte de `.node-version` / prod Railway) extrait dans `C:\Users\trist\nodejs-22\node-v22.19.0-win-x64\` — ajouté au **PATH utilisateur** (persistant, disponible dans les terminaux de Tristan).
- **npm 10.9.3** (bundlé) + **pnpm 11.0.8** activé via **corepack** (`packageManager` du `package.json`).
- `pnpm install --frozen-lockfile` → **OK** (exit 0, 3m39, aucune erreur), `node_modules/` présent.
- `pnpm db:generate` → **Prisma Client v6.19.3 généré** (exit 0).
- **`pnpm typecheck` (`tsc --noEmit`) → PASSE, 0 erreur** (exit 0). ⇒ le code compile réellement sur cette machine.

> Note PowerShell : lancer pnpm affiche une ligne rouge « NativeCommandError » — c'est juste PowerShell qui encapsule la bannière stderr de pnpm, **pas une vraie erreur** (exit codes = 0). Préfixer le PATH dans chaque session non-interactive : `$env:Path = "$env:USERPROFILE\nodejs-22\node-v22.19.0-win-x64;" + $env:Path`.

### ⚠️ À savoir
- **Build / run nécessitent des `.env`** : `pnpm dev` et `pnpm build` ont besoin de `DATABASE_URL`, `BETTER_AUTH_SECRET`, etc. (la CI utilise des placeholders). Pas encore créés en local → `typecheck`/`lint` OK sans, mais pour lancer le serveur ou builder il faudra un `.env.local`.
- **Déploiement reste Railway** : push `main` → Railway build (install + `db:generate` + build) + healthcheck. La pré-vérif locale (typecheck/lint) est désormais possible **avant** push — à faire systématiquement.
- **Git — RÉSOLU (2026-06-20)** : le dossier était copié sans `.git/`. Reconnecté à `github.com/tristanlejeune33-commits/Ruliz` via `git init` + remote + `fetch` (lecture seule, sans rien écraser). **Comparaison : cette copie est strictement identique à `origin/main`** (dernier commit `91f92a7`, 2026-06-17 « feat(diag): test panel sur les 6 langues cibles ») — **0 fichier modifié, 0 en avance, rien de non poussé**. La branche locale `main` track `origin/main`. Le push (→ Railway) est donc opérationnel. Seul fichier non suivi : ce `PROJECT_CONTEXT.md`.
- **`.env` / `.env.local` absents** (seuls `.env.example` et `.env.local.example` présents) : aucune connexion DB/services configurée localement.
- `tsconfig.tsbuildinfo` (~900 Ko) est présent et committé — cache de build d'une session antérieure, sans valeur ici.

### 🆕 Code présent mais NON couvert par la doc (`AGENT.md` s'arrête au 2026-05-18)
Ces fonctionnalités sont **déjà committées/poussées sur `origin/main`** (donc pas du travail perdu) mais ne sont pas décrites dans les docs — `AGENT.md` (2026-05-18) est simplement **en retard sur le code** (HEAD distant = 2026-06-17) :
- **Mini-site vitrine par restaurant** : `src/features/restaurant-site-v2/` (Hero, Navbar, Gallery, Testimonials, Lenis…), routes `dashboard/site` (éditeur) + `site/[id]` (public, avec `opengraph-image`), loader `server/public/restaurant-site-v2-loader.ts`.
- Routes dashboard supplémentaires : `dashboard/jeu` (+ `participations`), `dashboard/clients` (base clients).
- Login **Google OAuth** optionnel (`GOOGLE_CLIENT_ID/SECRET` dans `.env.example`) et `GOOGLE_MAPS_API_KEY` (avis Google sur le mini-site) — non mentionnés dans la liste d'env vars de `AGENT.md`.

---

## 6. Commandes utiles (depuis `package.json`)
> ⚠️ Toutes nécessitent d'abord d'installer Node 22 + pnpm 11, puis `pnpm install`.

```bash
# Setup
pnpm install                  # installe les deps (frozen-lockfile en CI)
pnpm db:generate              # génère le client Prisma

# Dev
pnpm dev                      # serveur dev :3000 (pnpm dev:turbo pour Turbopack)
pnpm typecheck                # tsc --noEmit
pnpm lint                     # ESLint sur src/ + prisma/
pnpm build                    # build production (vérifie tout)

# Base de données (charge .env.local puis .env via dotenv-cli)
pnpm db:migrate               # prisma migrate dev (nouvelle migration)
pnpm db:deploy                # prisma migrate deploy (local)
pnpm db:deploy:prod           # migrate deploy sans dotenv (prod Railway)
pnpm db:studio                # GUI Prisma Studio
pnpm db:reset                 # drop + reseed
pnpm seed                     # seed seul (admin Tristan + 2 clients + cartes démo)

# Intégrations / tests
pnpm test:anthropic           # ping Anthropic API
pnpm test:r2                  # test upload+delete R2
pnpm test:e2e                 # Playwright (e2e:ui, e2e:headed, e2e:report)
pnpm auth:generate            # régénère le schéma Better-Auth
```
**Déploiement** : push sur `main` → Railway redéploie (build `nixpacks.toml`, start `pnpm db:deploy:prod && pnpm start`, healthcheck `/api/health`).

---

## 7. Questions ouvertes / zones d'incertitude (pour Tristan)

1. ~~**Environnement machine**~~ — **Résolu/clos** : pas d'env local par design, Railway build au push. Pas d'action.
2. ~~**Git**~~ — **Résolu** : dossier relié à `origin/main`, parfaitement synchro, push opérationnel.
3. **Vérification avant push** — comme on ne build pas en local, veux-tu qu'on s'appuie uniquement sur la **CI GitHub** (lint/typecheck/build) comme garde-fou, ou que je propose une commande de validation rapide à lancer de ton côté avant chaque push important ?
4. **Doc vs code** — confirmes-tu que je peux **mettre `AGENT.md` à jour** pour y intégrer `restaurant-site-v2` (mini-site vitrine), `dashboard/jeu`, `dashboard/clients` et Google OAuth/Maps (déjà en prod, juste pas documentés) ?
5. **Objectif de session** — sur quoi veux-tu qu'on travaille (lancement pilote outreach, finition mini-site, bugfix précis, nouvelle feature) ?
6. **`PROJECT_CONTEXT.md`** — je le commit/push avec le repo, ou tu préfères le garder en local non suivi ?

---

*Fin de la cartographie (Phase 1 + 2). Aucune modification de code effectuée. En attente de validation et de l'objectif de session avant tout développement.*
