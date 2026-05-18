# 🤖 AGENT.md — Le doc unique à lire si tu reprends ce projet

> **Tu es un agent IA qui arrive sur ce projet à froid ? Lis ce fichier en entier.**
> Tout le reste est référence (CLAUDE.md = brief original, HANDOVER.md = historique,
> DISCOVERY.md = early decisions). Ce fichier est le **plan de vol courant**.
>
> Dernière mise à jour : 2026-05-18 — commit `b82fa79`

---

## 🎯 0. TL;DR — En 30 secondes

**Ruliz** = SaaS B2B français qui transforme les menus de restaurants en cartes digitales scannables (QR code à table) avec traduction IA en 7 langues, photos, allergènes et jeu d'avis Google.

**État aujourd'hui** :
- ✅ MVP complet en production sur `https://ruliz-panel.fr` (Railway)
- ✅ Auth, dashboard, éditeur de carte, carte publique, Stripe, emails, SMS
- ✅ **Pipeline d'acquisition cold email 2000+ prospects entièrement codé** (workers Inngest, IA marketer, admin UI, webhook Smartlead)
- ⏳ En attente humain : achat domaines warmup + setup Smartlead.ai pour lancer la campagne

**Repo** : `https://github.com/tristanlejeune33-commits/Ruliz`
**Branch** : `main`
**Push** : automatique vers main après chaque feature cohérente (CLAUDE.md le demande). Railway redéploie auto.

---

## 🏗️ 1. Architecture haut niveau

### Stack
| Layer | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 15** (App Router) + React 19 + TS strict | RSC + ISR critique pour carte publique |
| Styling | **Tailwind v4** + shadcn/ui custom | DS dual mode dark néon / light brand `#26438A` |
| DB | **PostgreSQL 16** via Railway | Géré, scaling vertical OK pour 50-500k prospects |
| ORM | **Prisma 6.19** | Type-safe, migration robuste |
| Auth | **Better-Auth 1.6.9** | Cookies httpOnly, multi-rôle (admin/client/team) |
| Storage | **Cloudflare R2** (S3 API via @aws-sdk) | CDN gratuit + $0.015/GB stockage |
| Paiements | **Stripe 22.1** | Checkout + Customer Portal + Webhooks idempotents |
| Emails | **Resend** | 100/jour gratuit, $20/mo pour 50k |
| SMS | **Brevo** | Offre Pro/Premium |
| IA | **Anthropic `claude-haiku-4-5-20251001`** | Traduction + OCR + AI marketer + classifier replies |
| Cache | **Redis** (Railway) + in-memory hybride | 4 niveaux : CDN → ISR → Redis → DB |
| Jobs | **Inngest 4.3** | Workers cron + retry + concurrency |
| Hosting | **Railway** | App + Postgres + Redis dans 1 projet |
| Package mgr | **pnpm 11.0.8** | Strict, monorepo-ready |

### Topologie Railway
```
Projet Ruliz
├── service ruliz (Next.js standalone)
│   ├── Build : pnpm install --frozen-lockfile && pnpm db:generate && pnpm build
│   ├── Start : pnpm db:deploy:prod && pnpm start
│   ├── Node 22 LTS pinned (24 casse Corepack)
│   ├── Healthcheck : /api/health
│   └── Custom domain : ruliz-panel.fr (ALIAS Hostinger)
├── service postgres (managed)
└── service redis (managed)
```

### Cache 4 niveaux sur `/carte/[id]`
```
Cloudflare edge (60s TTL) ← 99% des hits
  → ISR Next.js (revalidate 60)
    → Redis (clé `carte:{id}:{lang}`)
      → DB (table produit_translations cachée à vie)
```

---

## 📁 2. Structure des dossiers

```
ruliz/
├── CLAUDE.md              ← Brief original projet (à lire 1 fois pour le contexte)
├── HANDOVER.md            ← Historique passation (2026-05-13, avant l'outreach)
├── AGENT.md               ← CE FICHIER — plan de vol courant
├── README.md              ← Intro projet courte
├── DISCOVERY.md           ← Décisions design phase 0 (référence)
├── docs/
│   ├── schema.sql                       ← Schéma DB initial (référence historique)
│   ├── design-system.md                 ← DS dark
│   ├── design-system-light.md           ← DS light brand-blue
│   ├── design-system-mobile.md          ← DS carte publique
│   ├── outreach-2000-architecture.md    ← Architecture détaillée pipeline cold email
│   └── outreach-2000-runbook.md         ← Runbook ops pour lancer la campagne
├── prisma/
│   ├── schema.prisma                    ← Source de vérité du modèle DB
│   ├── seed.ts                          ← Seed (admin Tristan + 2 clients + cartes test)
│   ├── migrations/                      ← Migrations Prisma versionnées
│   └── sql/
├── scripts/
│   ├── filter-prospects-pilote.js       ← Filtre 20k restos XLSX → 2k CSV qualité
│   ├── import-prospects-pilote.ts       ← Import CSV → DB (sinon utiliser UI admin)
│   ├── seed-email-variants.ts           ← Seed 12 variants emails outreach
│   ├── export-prospects-for-smartlead.ts ← Export CSV upload Smartlead
│   ├── extract-source.mjs               ← Extraction code source (debug)
│   └── r2-test.ts                       ← Test connexion R2
├── data/                                ← Gitignore RGPD (CSV emails tiers)
└── src/
    ├── app/
    │   ├── (marketing)/                 ← / + /pricing + /legal/*
    │   ├── (auth)/                      ← /login + /signup + /forgot + /reset
    │   ├── admin/                       ← Back-office Tristan
    │   │   ├── clients/                 ← CRUD clients
    │   │   ├── restaurants/             ← Vue globale restaurants
    │   │   ├── boutique/                ← Gestion boutique QR/stickers
    │   │   ├── outreach/                ← ⭐ Dashboard campagne cold email
    │   │   │   ├── variants/            ← Voir/copier les 12 HTMLs emails
    │   │   │   └── replies/             ← Replies AI-classifiées
    │   │   ├── factures/                ← Factures Stripe + archive locale
    │   │   ├── demo/                    ← Route handler créer Bistrot Ruliz démo
    │   │   ├── email-test/              ← Tester les 6 templates emails
    │   │   ├── settings/                ← Settings admin global
    │   │   └── activity/, logs/, billing/, debug-horaires/
    │   ├── dashboard/                   ← Espace restaurateur
    │   │   ├── menu/                    ← Éditeur de carte drag&drop
    │   │   ├── restaurant/              ← Édition resto + branding + horaires
    │   │   ├── qrcodes/                 ← Génération QR
    │   │   ├── stats/                   ← Stats scans (Recharts)
    │   │   ├── settings/                ← Profil, billing, factures, équipe
    │   │   ├── sms/                     ← SMS marketing
    │   │   ├── popups/                  ← Pop-ups événements
    │   │   ├── team/                    ← Invitations équipe
    │   │   └── onboarding/              ← Tour produit
    │   ├── carte/[id]/                  ← ⭐ Carte publique mobile ISR (CRITIQUE perf)
    │   ├── preview/[token]/             ← ⭐ Page prospect cold email (carte pré-générée)
    │   ├── c/                           ← Short URLs (QR code minified)
    │   └── api/
    │       ├── inngest/                 ← Webhook Inngest
    │       ├── stripe/webhook/          ← Webhook Stripe (idempotent)
    │       ├── outreach/event/          ← ⭐ Webhook Smartlead.ai
    │       ├── upload/                  ← Upload R2 presigned URLs
    │       └── health/                  ← Healthcheck Railway
    ├── components/
    │   ├── ui/                          ← shadcn customisé
    │   └── shared/                      ← AppShell, Sidebar, Topbar, PageHero
    ├── lib/
    │   ├── db.ts                        ← Prisma client singleton
    │   ├── auth.ts                      ← Better-Auth config + callbacks
    │   ├── redis.ts                     ← Redis client + status check
    │   ├── r2.ts                        ← Cloudflare R2 utilities
    │   ├── email-template.ts            ← ⭐ Template maître emails (emailLayout + helpers)
    │   ├── ensure-runtime-schema.ts     ← ⭐ ALTER TABLE IF NOT EXISTS au boot (anti-drift)
    │   ├── serialize.ts                 ← BigInt safe serializer
    │   ├── stripe.ts                    ← Stripe client + utilities
    │   ├── admin-demo.ts                ← Mode démo admin (Bistrot Ruliz)
    │   ├── session.ts                   ← requireAdmin + requireUser
    │   └── ...
    ├── server/
    │   ├── admin/                       ← Server actions back-office
    │   │   ├── queries.ts               ← listClients, etc.
    │   │   ├── outreach-queries.ts      ← ⭐ getOutreachStats, listProspects
    │   │   ├── outreach-actions.ts      ← ⭐ Upload CSV + seed + trigger + export
    │   │   └── ...
    │   ├── dashboard/                   ← Server actions restaurateur
    │   ├── auth/                        ← signupClient, login utilities
    │   ├── public/                      ← Queries carte publique (cache)
    │   ├── billing/                     ← Stripe + invoice-archive
    │   ├── boutique/                    ← QR/stickers commandes
    │   ├── sms/                         ← Brevo emails + campaigns
    │   ├── translation/                 ← Anthropic translate service
    │   ├── outreach/                    ← ⭐ Pipeline cold email (NEW)
    │   │   ├── enrich.ts                ← Scrape site → logo + menu source
    │   │   ├── generate-card.ts         ← Anthropic Vision OCR → cardJson
    │   │   ├── validate-email.ts        ← Syntaxe + role + MX DNS
    │   │   ├── activate-prospect.ts     ← Convertit prospect → Restaurant réel
    │   │   ├── welcome-email.ts         ← Email post-activation
    │   │   ├── email-variants-seed.ts   ← 12 variants emails A/B/C × 4 steps
    │   │   ├── ai-marketer.ts           ← Génère variants + classifie replies
    │   │   └── csv-parser.ts            ← Parser CSV partagé
    │   └── inngest/
    │       ├── client.ts                ← Inngest client + types events
    │       ├── functions.ts             ← Workers traduction + SMS
    │       └── outreach-functions.ts    ← ⭐ Workers enrich + generate + cron
    └── types/
```

---

## 🚀 3. Features livrées (chronologique)

### Phase 0-6 (avant 2026-05-13) — voir HANDOVER.md pour le détail
- Setup, design system dual mode, back-office admin complet
- Dashboard client : éditeur carte drag&drop, QR codes, roulette, pop-ups, SMS, équipe
- Carte publique mobile ISR 7 langues, cache 4 niveaux
- Stripe : Freemium/Pro/Premium + Customer Portal + boutique QR
- GDPR, security hardening, pages légales, emails refondus

### Phase 7+ — Travaux 2026-05-15 à 2026-05-18

#### ⭐ Pipeline cold email outreach 2000+ prospects

**Objectif** : Acquérir des restaurateurs en générant **automatiquement leur carte digitale** à partir de leur site web public, puis leur envoyer un email perso avec un lien `/preview/{token}` montrant SA carte → bouton "Activer" qui crée son compte.

**Architecture en 4 phases** :

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. INPUT — Données prospects (TripAdvisor scraping)                 │
│    CSV 20 084 restos → filtrage qualité → 2 000 prospects           │
│    (rating ≥4, site web réel, déduplication, cap 280/ville)         │
└─────────────────────────────────┬──────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. ENRICHMENT + GENERATION (Workers Inngest, ~2-3h pour 2k)         │
│    • Validation email (DNS MX + syntaxe + role-based filter)        │
│    • Scrape site → og:image (logo) + lien menu PDF/HTML             │
│    • Anthropic Vision OCR menu PDF → cardJson structuré             │
│    • Fallback HTML parsing + génération générique par cuisine type  │
│    • Génère cardToken aléatoire 16 octets                           │
│    → Statut prospect : queued → enriched → generated                │
└─────────────────────────────────┬──────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. OUTREACH (Smartlead.ai — externe, config humain)                 │
│    • Upload CSV {email, nom, ville, first_name, preview_url}        │
│    • 4 steps × 3 variants A/B (J+0, J+3, J+7, J+14)                 │
│    • Rotation 5 domaines warmés + drip 200/jour                     │
│    • Tracking via webhook → /api/outreach/event                     │
└─────────────────────────────────┬──────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. CONVERSION (Page preview + activation auto)                       │
│    • Resto clique mail → /preview/{token}                            │
│    • Voit SA carte mobile rendered + CTA "Activer"                   │
│    • Click CTA → /signup?prospect={token}                            │
│    • signupClient() crée User → activateProspect() crée Restaurant   │
│    • Categories + Produits dénormalisés depuis cardJson              │
│    • Traductions 6 langues lancées en background (Inngest)           │
│    • Email bienvenue Tristan envoyé via Resend                       │
│    • Toast success + redirect /dashboard                             │
└────────────────────────────────────────────────────────────────────┘
```

**Composants livrés** (10 fichiers nouveaux + intégrations) :

| Fichier | Rôle |
|---|---|
| `src/server/outreach/enrich.ts` | Scrape site web → logo + menu source |
| `src/server/outreach/generate-card.ts` | Anthropic Vision OCR PDF/image + HTML parser + fallback |
| `src/server/outreach/validate-email.ts` | RFC 5322 + role-based + DNS MX lookup avec cache 1h |
| `src/server/outreach/activate-prospect.ts` | Atomique : Restaurant + Categorie + Produit depuis cardJson |
| `src/server/outreach/welcome-email.ts` | Email bienvenue post-activation (template Ruliz) |
| `src/server/outreach/email-variants-seed.ts` | 12 variants emails A/B/C × 4 steps |
| `src/server/outreach/ai-marketer.ts` | Génère nouveaux variants + classifie replies (Anthropic Haiku) |
| `src/server/outreach/csv-parser.ts` | RFC 4180 parser CSV partagé |
| `src/server/inngest/outreach-functions.ts` | 3 workers : enrich (concurrency 10), generate (5), cron hourly + AI marketer weekly |
| `src/server/admin/outreach-queries.ts` | KPIs funnel + liste prospects + variants stats |
| `src/server/admin/outreach-actions.ts` | Upload CSV + seed variants + trigger pipeline + download Smartlead CSV |
| `src/app/admin/outreach/page.tsx` | Dashboard funnel temps réel + 4 boutons pilotage |
| `src/app/admin/outreach/outreach-actions.tsx` | Composant client (file input + 3 boutons + download) |
| `src/app/admin/outreach/variants/page.tsx` | Grille 12 variants × stats + copy HTML |
| `src/app/admin/outreach/replies/page.tsx` | Replies AI-classifiées par catégorie |
| `src/app/preview/[token]/page.tsx` | Page perso prospect (carte mobile + CTA activation) |
| `src/app/api/outreach/event/route.ts` | Webhook Smartlead → tracking sent/open/click/reply |

**3 nouvelles tables Prisma** :
- `prospect_restaurants` (20+ colonnes, indexes sur status/source/cardToken/ville)
- `outreach_events` (history complet sent/open/click/reply/bounce/unsubscribe)
- `email_variants` (12 lignes seed × campagne)

**Cron Inngest** :
- `outreach-cron-enqueue-queued` toutes les heures (`0 */1 * * *`) → trigger enrich des `queued`
- `outreach-cron-ai-marketer` chaque lundi 9h UTC → génère un nouveau variant par step (gate 50 envois)

**Coûts** :
- One-shot : ~$15-20 Anthropic pour générer 2000 cartes
- Récurrent : $39/mo Smartlead + $10/mo Anthropic AI marketer + ~$30/an domaines = **~$70/mo**

**Documentation détaillée** :
- `docs/outreach-2000-architecture.md` (600 lignes) — architecture complète
- `docs/outreach-2000-runbook.md` — guide ops pour lancer la campagne

---

## 🗺️ 4. Routes principales

### Public
- `/` — Vitrine marketing
- `/pricing` — Plans
- `/legal/mentions-legales`, `/legal/politique-confidentialite`
- `/carte/[id]?lang=fr|en|...` — **Carte publique** (ISR + Redis + Cloudflare edge)
- `/preview/[token]` — **Page prospect cold email** (track click async via `after()`)
- `/c/{shortCode}` — Short URLs QR

### Auth
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/signup?prospect={token}` — **Activation prospect** (pré-rempli + crée Restaurant)

### Dashboard restaurateur
- `/dashboard` — Tableau de bord
- `/dashboard/menu` — Éditeur carte drag&drop
- `/dashboard/restaurant` — Édition resto + horaires
- `/dashboard/qrcodes`, `/dashboard/stats`, `/dashboard/popups`, `/dashboard/sms`
- `/dashboard/settings` (+ `?tab=billing|factures|equipe`)
- `/dashboard/onboarding` — Tour produit

### Admin
- `/admin` — Vue d'ensemble
- `/admin/clients`, `/admin/restaurants`, `/admin/factures`, `/admin/logs`
- `/admin/boutique` — Gestion catalogue
- **`/admin/outreach`** — Dashboard campagne cold email
- **`/admin/outreach/variants`** — Voir/copier HTMLs emails
- **`/admin/outreach/replies`** — Replies AI-classifiées
- `/admin/demo` — Route handler : crée Bistrot Ruliz démo
- `/admin/email-test` — Test des 6 templates emails

### APIs
- `/api/health` — Healthcheck Railway
- `/api/inngest` — Webhook Inngest
- `/api/stripe/webhook` — Webhook Stripe (idempotent)
- **`/api/outreach/event`** — **Webhook Smartlead.ai**

---

## 🔑 5. Concepts clés / patterns à respecter

### `ensureRuntimeSchema()` au lieu de migrations Prisma manuelles
**Localisé** : `src/lib/ensure-runtime-schema.ts`

Pourquoi : Railway redéploie auto à chaque push, on veut **zéro downtime**. Au lieu de `prisma migrate deploy` qui peut casser si un ALTER TABLE est lourd, on fait des `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` au démarrage du serveur.

**Quand l'utiliser** :
- Ajout colonne nullable → ensureRuntimeSchema
- Ajout nouvelle table → ensureRuntimeSchema
- Migration destructive (DROP COLUMN, RENAME) → Prisma migration classique

**⚠️ Piège Postgres 42601** : `$executeRawUnsafe` n'accepte qu'1 statement. Toujours **split** les CREATE TABLE et CREATE INDEX en appels séparés.

### Server Actions > API Routes
Préfère toujours :
```typescript
// src/server/dashboard/menu-actions.ts
"use server";
export async function saveProduit(input: unknown) { ... }
```

Plutôt que d'inventer `/api/menu/produit/save`. Sauf si :
- Webhook externe (Stripe, Smartlead, Inngest)
- Endpoint consommé par client tiers
- Streaming (R2 upload presigned)

### Validation Zod systématique
```typescript
const schema = z.object({ email: z.email(), ... });
const parsed = schema.safeParse(input);
if (!parsed.success) return { ok: false, error: ... };
```

Sur **TOUS** les inputs server actions (et même côté client pour UX).

### Cookies httpOnly only
Jamais `localStorage` pour l'auth ou les sessions. Better-Auth gère.

Cookies internes Ruliz :
- `ruliz_active_restaurant` — restaurant actif si user multi-restos
- `ruliz_impersonate_user_id` — admin SAV (TTL 1h)
- `ruliz_admin_demo` — mode démo admin

### Sérialisation BigInt
**Toujours** passer par `serialize()` (`src/lib/serialize.ts`) avant de retourner des données Prisma à un Client Component. Les BigInt cassent JSON.stringify.

```typescript
const data = await prisma.restaurant.findMany({ ... });
return <Component data={serialize(data)} />;
```

### Inngest pour jobs background
Tout ce qui dure >2s doit aller en Inngest. Exemples :
- Traduction multi-langues
- Génération carte prospect (Anthropic Vision lent)
- Envoi SMS campaign

Pattern :
```typescript
// 1. Dans le code synchrone, envoie l'event
await inngest.send({ name: "prospect/enrich.requested", data: { prospectId: id.toString() } });

// 2. Le worker dans src/server/inngest/outreach-functions.ts traite
```

**BigInt → string** dans les events (Inngest sérialise en JSON).

---

## 🛡️ 6. Sécurité

### Auth obligatoire
- `requireAdmin()` sur toutes les routes `/admin/*` (server-side check)
- `requireUser()` sur toutes les routes `/dashboard/*`
- Middleware Next.js `src/middleware.ts` redirige les non-authentifiés

### RLS-style guards
Un client ne voit QUE ses restaurants. Toujours filtrer par `userId` :
```typescript
where: { restaurant: { userId: session.user.id } }
```

### CSP headers
`next.config.ts` configure :
- `img-src` whitelist : `r2.cloudflarestorage.com`, `flagcdn.com`, `images.unsplash.com`, etc.
- `script-src` strict
- `connect-src` Inngest + Stripe + Anthropic

Si une image externe ne s'affiche pas → ajouter au CSP + à `remotePatterns` de `next.config.ts`.

### Rate limiting
- `/carte/[id]` : 60 req/min/IP (Redis cross-instance)
- Cookies HMAC-signed pour anti-CSRF

### Webhook idempotence
- Stripe : table `stripe_processed_events` + check avant traitement
- Smartlead : pas critique (events idempotents par nature)

### GDPR / Suppression compte
- `/dashboard/settings` → "Supprimer mon compte"
- Anonymise PII, cancel Stripe, purge R2, hard-delete AuthUser
- Conserve `invoices_archive` (10 ans légal)

---

## 🐛 7. Pièges historiques (à ne pas refaire)

| Piège | Symptôme | Solution |
|---|---|---|
| `request.url` dans route handler Railway | Redirect vers port 8080 interne | Utiliser path relatif `redirect("/dashboard")` ou `x-forwarded-host` |
| `<Link>` Next sur route handler | Cookies perdus (SPA RSC fetch) | Utiliser `<a>` natif (full page reload) |
| Anthropic à la volée pendant scan public | Latence 5s + coût | TOUJOURS background Inngest + cache DB à vie |
| Manque colonne en prod après modif schema | Save silencieusement KO | Ajouter à `ensureRuntimeSchema()` |
| BigInt JSON.stringify crash | "Do not know how to serialize" | `serialize()` avant retour client |
| Postgres 42601 multiple commands | `$executeRawUnsafe` plante | Split CREATE TABLE + CREATE INDEX en appels séparés |
| `data.field || "default"` | Empêche de vider un champ | Utiliser `??` ou helper `empty()` pour distinguer null/empty |
| Force-cache sur page éditable | User voit version cached après save | `export const dynamic = "force-dynamic"; export const revalidate = 0;` |
| Redis spam logs en prod | Logs envahis | Check `redis.status` avant chaque commande |

---

## 🔄 8. Workflow agent IA — comment travailler

### En arrivant
1. **Lis ce fichier** (AGENT.md) en entier
2. **Lis CLAUDE.md** une fois pour le contexte (vision, ton, anti-patterns)
3. `cd /c/dev/ruliz && git status && git log --oneline -10` pour voir où on en est
4. **Pull** si reprise après pause longue
5. **Vérifie sur Railway** : https://ruliz-panel.fr fonctionne ?

### Pendant une tâche
1. **Demande clarification** si <5 lignes ambiguës → fais. Si gros chantier ambigu → propose plan d'abord
2. **Code propre, pas de sur-ingénierie** (Tristan déteste)
3. **TypeScript strict** : pas de `any`, pas de `as any`
4. **Tailwind direct** (pas de CSS modules sauf cas extrême)
5. **Server actions** privilégiées
6. **Toast Sonner** pour feedback user (jamais alert/confirm sauf actions destructives)

### Avant de commit
1. `cd /c/dev/ruliz && pnpm tsc --noEmit` (typecheck)
2. `cd /c/dev/ruliz && pnpm build` (vérifie que la prod compile)
3. Si tout passe → commit + push

### Format commit
```
feat(scope): description courte (<70 chars)

Description longue qui explique le QUOI et le POURQUOI.
Bullet points OK.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Types : `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`.

### Push
**Automatique après chaque feature cohérente** (Tristan le veut). Pas besoin de demander. Railway redéploie tout seul.

Exception : si tu commit une modif destructive ou expérimentale, demande validation.

### Si tu casses
- Railway garde 3 derniers déploiements → rollback 1 clic
- Tu peux aussi `git revert <sha> && git push`
- Ne JAMAIS `git push --force` sans demande explicite

---

## 📋 9. État du déploiement (2026-05-18)

### ✅ En prod et fonctionnel
- Domaine `ruliz-panel.fr` avec SSL Let's Encrypt (Railway gère)
- Auth Better-Auth (cookies httpOnly, signup/login/forgot/reset)
- Dashboard restaurateur complet
- Carte publique mobile multi-langues
- Stripe Checkout + Customer Portal + Webhooks
- Emails Resend (welcome, reset, team-invite, boutique-paid, sms-pack)
- SMS Brevo (envoi + balance + automations)
- Boutique QR (Stripe + Colissimo 9 paliers 2026)
- Mode démo admin (Bistrot Ruliz)
- Pipeline outreach (code complet, en attente humain)

### ⏳ En attente humain (Tristan)
1. **Achat 5 domaines warmup** chez Hostinger :
   - `ruliz-pro.fr`, `hello-ruliz.com`, `equipe-ruliz.fr`, `try-ruliz.com`, `ruliz-app.fr`
   - Coût : ~50 €/an
2. **Configuration DNS** chez Hostinger : SPF + DKIM + DMARC pour chaque domaine
3. **Souscription Smartlead.ai Basic** ($39/mo) + connection des 10 mailboxes
4. **Warmup 4 semaines** (passif, Smartlead gère)
5. **Env var Railway** : `SMARTLEAD_WEBHOOK_SECRET=<random>`
6. **Lancement campagne** une fois warmup OK

### 🔮 Pas encore codé (optionnel)
- Domain health check page (test deliverability via mail-tester API)
- Email renouvellement abonnement (actuellement Stripe envoie son invoice)
- Variantes Chronopost / Outre-mer dans la boutique
- Page archive factures local prioritaire sur Stripe
- Module fidélité points (mentionné brief, pas commencé)

---

## 🎨 10. Design system

### Dual mode
- **Dark néon** (admin + dashboard) : `bg-[var(--bg-primary)]` near-black + `--accent` cyan néon
- **Light brand-blue** (auth pages + emails + carte publique) : `#26438A` primaire + blanc + slate

Variables CSS dans `src/app/globals.css`.

### Typo
- **Geist Sans** (body + display)
- **Geist Mono** (code, prix, KPIs)
- Loaded via `next/font/google` dans `src/app/layout.tsx`

### Composants custom
- `<PageHero>` (`src/components/shared/page-hero.tsx`) : eyebrow + title + description + kpis + actions
- `<AppShell>` : sidebar + topbar + content area
- `<SidebarBrand>`, `<SidebarNav>`, `<SidebarFooter>` : layout dashboard/admin
- shadcn customisé dans `src/components/ui/` (Button, Card, Badge, Dialog, etc.)

### Patterns d'icônes
- **lucide-react** uniquement
- Taille : `size-3.5` (inline avec texte), `size-4` (boutons), `size-5` (heros)
- Couleur : `text-[var(--text-muted)]` par défaut, sémantique sinon

### Animations
- **Framer Motion** pour entrées de listes (stagger)
- **Lenis** smooth scroll sur landing
- Transitions Tailwind 200-400ms ease-out pour micro-interactions

---

## 🧠 11. Anthropic — usage et coûts

### Modèles utilisés
- **`claude-haiku-4-5-20251001`** partout :
  - Traduction menus (texte court, peu cher)
  - OCR Vision (PDF/image menus prospects)
  - AI marketer (génération variants + classifier replies)

### Patterns d'appel
**Toujours via le wrapper** `getAnthropic()` de `src/server/translation/anthropic.ts` :
```typescript
const client = getAnthropic();
if (!client) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 500,
  temperature: 0.2,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: text }],
});
```

### Coûts mensuels typiques (50 restos actifs)
- Traduction continue : ~$2/mois (incrémentale, cache à vie)
- Outreach AI marketer : ~$10/mois (génération variants weekly + replies classification)
- One-shot génération 2000 cartes : ~$15-20

### Optimisations en place
- **Cache DB à vie** sur `produit_translations` (jamais re-traduit le même texte)
- **`temperature: 0.2`** pour consistance (pas créativité)
- **`max_tokens` minimal** par appel (sauf JSON outputs où on monte à 2000-4000)
- **Concurrency limit Inngest** : workers max 5 simultanés pour pas exploser le rate limit

---

## 📦 12. Commandes utiles

### Local
```bash
pnpm install
pnpm dev               # Dev server :3000
pnpm typecheck         # tsc --noEmit
pnpm lint              # ESLint
pnpm build             # Production build (vérifie tout)

pnpm db:generate       # Prisma generate (après modif schema)
pnpm db:migrate        # Prisma migrate dev (créer nouvelle migration)
pnpm db:deploy         # Prisma migrate deploy (apply en prod local)
pnpm db:studio         # GUI DB
pnpm seed              # Re-seed DB
```

### Prod Railway (depuis dashboard)
```bash
# One-off jobs Railway (ou via railway run --service=ruliz)
pnpm tsx scripts/import-prospects-pilote.ts
pnpm tsx scripts/seed-email-variants.ts
pnpm tsx scripts/export-prospects-for-smartlead.ts
```

### Git
```bash
git -C /c/dev/ruliz status
git -C /c/dev/ruliz log --oneline -10
# Push automatique après chaque commit cohérent
```

---

## 🗂️ 13. Variables d'environnement (Railway)

```bash
# DB & Cache (auto-injectés Railway)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# App
NEXT_PUBLIC_APP_URL=https://ruliz-panel.fr
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=https://ruliz-panel.fr

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend (emails transactionnels)
RESEND_API_KEY=re_...
MAIL_FROM=Ruliz <contact@ruliz-panel.fr>

# Brevo (SMS)
BREVO_API_KEY=
BREVO_SMS_SENDER=Ruliz

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Smartlead webhook (NEW outreach)
SMARTLEAD_WEBHOOK_SECRET=<random 32+>

# Admin
ADMIN_DEMO_EMAIL=tristanlejeune33@gmail.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 💼 14. Comptes seed

### Admin
- **Email** : `tristanlejeune33@gmail.com`
- **Mot de passe** : (settings local, ask Tristan)
- **Rôle** : `admin`
- **Carte démo** : Bistrot Ruliz (créée via `/admin/demo` ou auto au signup)

### Clients dev (seed seulement, pas en prod)
- `marie.dubois@tirebouchon.fr` — Le Tire-Bouchon, Bordeaux
- `pierre.martin@chezpierre.fr` — Chez Pierre

---

## 🚦 15. Roadmap court terme (priorité)

### 1. Lancement pilote outreach 2000 (humain + automatique)
- Acheter 5 domaines + warmup 4 semaines (humain)
- Upload CSV prospects + seed variants via UI admin (humain)
- Trigger pipeline enrichissement (humain, automatique)
- Audit qualité 30 cartes (humain)
- Config Smartlead (humain)
- Lancement drip 200/jour (humain)

### 2. Code à ajouter quand le pilote tourne
- **Page deliverability** `/admin/outreach/health` — test des domaines via mail-tester API
- **A/B Thompson Sampling** explicite dans Smartlead (config humain)
- **Dashboard cohort retention** — combien de conversions deviennent payantes
- **Email "Trial expiring"** J-3 avant fin essai gratuit

### 3. Scale 40k (mois 3-9)
- Acheter 15-20 domaines supplémentaires
- Upgrade Smartlead Pro → Custom Pro
- Optionnel : Mailforge.ai pour skip la gestion technique
- Module fidélité points (brief original, jamais commencé)

---

## 📞 16. Contact / liens

- **Repo** : https://github.com/tristanlejeune33-commits/Ruliz (branch `main`)
- **Prod** : https://ruliz-panel.fr
- **Railway** : railway.app (projet Ruliz)
- **Stripe** : dashboard.stripe.com (mode live)
- **Hostinger** (DNS) : hpanel.hostinger.com
- **Resend** : resend.com
- **Cloudflare R2** : configuré
- **Anthropic Console** : console.anthropic.com
- **Inngest** : app.inngest.com
- **Smartlead.ai** : (à créer)

**Tristan** : `tristanlejeune33@gmail.com` (admin panel + email perso)

---

## 🎬 17. Pour finir : philosophie Tristan

- **Français** uniquement (sauf code = anglais)
- **Communication directe**, sans corporate-speak
- **Pas de surengineering** (KISS)
- **Push souvent**, attendre rarement
- **Design ultra-moderne** (Linear, Vercel, Resend, Cal.com vibe)
- **Demande si tu doutes** sur les choix structurels
- **Mesure 2 fois, code 1 fois** (notamment pour les migrations DB)
- **Performance critique** sur `/carte/[id]` (la surface qui voit 99% du trafic)
- **Sécurité non-négociable** (Stripe, RGPD, GDPR delete)

Si tu suis ces principes + lis ce fichier + le code parle de lui-même → tu vas dériver Ruliz sans accroc.

Bonne suite 🚀
