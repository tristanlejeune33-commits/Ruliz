# 🎯 Mission : Construire Ruliz — SaaS de menus digitaux pour restaurants

Tu es Claude Code, agent autonome chargé de construire **from scratch** ce SaaS. Lis ce fichier en entier avant toute action.

---

## 📋 Vision produit

**Ruliz** est un SaaS B2B où des restaurateurs gèrent leur menu digital. Les clients du restaurant scannent un QR code à table, accèdent à la carte sur leur téléphone, peuvent la lire dans 7 langues (traduction IA via Anthropic Claude API), voir des photos, des allergènes, des suggestions d'accompagnement, et participer à un jeu roulette pour laisser des avis Google.

**4 surfaces produit** :
1. **Vitrine marketing** (`/`) — landing page commerciale
2. **Back-office Admin** (`/admin`) — Tristan, gestion globale des clients
3. **Dashboard Client** (`/dashboard`) — le restaurateur gère son resto, sa carte, ses QR codes
4. **Carte publique** (`/carte/[id]`) — la page que les clients scannent (CRITIQUE en perf)

**Charge cible** :
- 50 restaurants clients, ~100 000 hits/jour sur la carte publique
- Pic 12h-14h et 19h-21h (~50 req/sec)
- 95% lectures, 5% écritures
- Mobile 4G obligatoire sur la carte publique

---

## 🛠️ Stack technique imposée

**Pas de template, tu construis tout from scratch.**

```
Framework      : Next.js 15 (App Router) + TypeScript strict
Styling        : Tailwind CSS v4 + shadcn/ui
Animation      : Framer Motion + Lenis (smooth scroll)
DB             : PostgreSQL via Railway
ORM            : Prisma
Auth           : Better-Auth (cookies httpOnly, multi-rôle)
Cache KV       : Redis via Railway
Storage images : Cloudflare R2 (CDN)
Paiements      : Stripe + Stripe Customer Portal
Emails         : Resend
Traduction IA  : Anthropic Claude API (claude-haiku-4-5-20251001)
QR Codes       : qrcode (npm)
Drag & Drop    : @dnd-kit
Forms          : React Hook Form + Zod
Charts admin   : Recharts ou tremor
Icons          : lucide-react
Hosting        : Railway (app + DB + Redis dans le même projet)
Monitoring     : Sentry + Railway logs
Package manager: pnpm (préféré) ou npm
```

---

## 🎨 Design philosophy : ULTRA MODERNE, TRÈS TECH

L'utilisateur veut un design **bold, moderne, très tech**. Pas de SaaS terne. Pense Linear, Vercel, Resend, Cal.com, Stripe Dashboard.

### Direction visuelle générale

- **Dark mode par défaut** sur le dashboard et la vitrine, light mode dispo
- **Light mode par défaut** sur la carte publique (clarté du menu)
- Couleurs : palette neutre profonde + 1 couleur d'accent vibrante
- Typographie : **Geist Sans** (display + body) + **Geist Mono** pour code/data, OU **Inter** (à proposer)
- Beaucoup d'**espace blanc**, marges généreuses
- Transitions fluides (200-400ms ease-out), animations subtiles
- Composants minimalistes mais avec personnalité (pas du shadcn brut, customisé)

### Tokens design proposés (à affiner par l'agent)

```css
--bg-primary       : oklch(0.145 0 0);        /* near-black */
--bg-elevated      : oklch(0.18 0 0);
--bg-card          : oklch(0.205 0 0);
--border-subtle    : oklch(0.27 0 0);
--text-primary     : oklch(0.985 0 0);        /* near-white */
--text-secondary   : oklch(0.708 0 0);
--text-muted       : oklch(0.5 0 0);

/* Accent — choisis-en UN seul, propose 3 options à Tristan */
--accent           : oklch(0.7 0.18 145);     /* vert lime électrique */
                  OR oklch(0.65 0.22 25);     /* orange vibrant */
                  OR oklch(0.6 0.25 280);     /* violet électrique */
```

### Patterns UI à utiliser

- **Bento grids** pour le dashboard (style Vercel)
- **Command palette** (`Cmd+K`) pour navigation rapide (cmdk lib)
- **Toasts** modernes (Sonner)
- **Skeletons** pendant le chargement (jamais de spinners moches)
- **Hover states** subtils avec slight scale ou border glow
- **Empty states** illustrés et utiles (pas juste "No data")
- **Micro-interactions** sur boutons, inputs, badges
- **Gradients subtils** sur les CTA principaux
- **Glassmorphism** modéré pour overlays/modals
- **Animations d'entrée** des listes (stagger children avec Framer Motion)

### Carte publique mobile (différent du dashboard)

- Light mode, design **élégant et appétissant** (food-friendly)
- Photos produit en hero (ratio 4:3 ou 16:9)
- Typographie editorial (mix display + body)
- Catégories en horizontal scroll OU accordéon plein écran
- Modal produit avec animation slide-up
- Switch de langue avec flag dans header sticky
- Bouton "favoris" avec haptic feedback (si possible)

---

## 🏗️ Architecture technique (non-négociable)

### Cache à 4 niveaux pour la carte publique

1. **Cloudflare edge cache** : devant Railway, TTL 60s sur la route publique
2. **ISR Next.js** : `revalidate = 60`, `generateStaticParams` au build
3. **Redis Railway** : cache des cartes traduites (clé `carte:{id}:{lang}`)
4. **DB cache** : table `produit_translations` qui stocke les trads Claude API à vie

### Invalidation lors d'une modif côté restaurateur

```
1. Save produit/catégorie côté dashboard
2. Trigger : invalidate ISR de toutes les langues du restaurant (revalidatePath)
3. Purge Redis keys carte:{id}:*
4. Job background : ré-traduire les champs modifiés (diff intelligent)
```

### Tracking scans (asynchrone)

- Jamais bloquer la réponse pour incrémenter un compteur
- Utiliser `waitUntil()` Next.js pour insérer dans table `scans`
- Compteurs `scan_total` et `scan_mois` mis à jour par cron (Railway cron job, toutes les 5 min)

### Images

- Upload vers Cloudflare R2 via presigned URL
- Service via `next/image` avec loader R2 custom
- Format AVIF/WebP forcé, lazy loading par défaut
- Max 600 KB par carte rendue (compression server-side)

---

## 🌍 Système de traduction Anthropic (le morceau critique)

**Coût visé** : <5€/mois pour 50 restos × 7 langues. On cache TOUT.

### Modèle

- **`claude-haiku-4-5-20251001`** (rapide, peu cher, qualité excellente pour de la traduction de menu)
- Configuration : `max_tokens: 500`, `temperature: 0.2` (consistance)

### Flow

```
1. Restaurateur sauvegarde un produit (titre + description en FR)
2. Hook DB : invalide les translations existantes pour ce produit (DELETE WHERE produit_id = X)
3. Job queue Railway worker : pour chaque langue cible (en, es, de, it, pt, zh) :
   a. Vérifie cache DB (forever)
   b. Sinon → appelle Anthropic API
   c. Insert dans produit_translations
4. Invalide cache Redis + ISR
```

### Prompt système Anthropic

```
You are a professional restaurant menu translator.
Translate the following French text to {target_language_full_name}.

Strict rules:
- Keep proper nouns and brand names in original form
- Keep wine names, cheese names like "chèvre", regional specialities in French (italicized if possible)
- Keep currency symbols (€) and numbers untouched
- Use restaurant-menu register: concise, appetizing, professional
- Output ONLY the translated text, no preamble, no quotes, no explanation

Text to translate:
{text}
```

### Fallback

Si Anthropic API fail → afficher le texte FR avec un petit indicateur 🇫🇷, ne jamais montrer une page cassée.

---

## 📊 Schéma DB

Le fichier `/docs/schema.sql` contient le schéma complet (users, restaurants, qrcodes, categories, produits, vignettes, allergenes, suggestions, translations, scans, jeux, popups, base_clients, logs).

**Tu DOIS** :
- Le porter en migrations Prisma (`schema.prisma`)
- Garder les noms de tables et colonnes identiques (snake_case en DB, camelCase en Prisma via `@map`)
- Garder les contraintes CHECK et les indexes
- Garder le partitionnement de la table `scans` (Postgres native partitioning)

---

## 🎯 Scope MVP (Phases 0 à 6)

### Phase 0 — Setup (jour 1)
- [ ] Init Next.js 15 + TS + Tailwind v4 + shadcn/ui
- [ ] Setup Prisma + schema.prisma basé sur docs/schema.sql
- [ ] Setup Better-Auth (multi-rôle : admin/client/team)
- [ ] Seed : 1 admin, 2 clients, 2 restaurants, 1 carte démo "Le Tire-Bouchon"
- [ ] Configuration Railway (railway.toml)
- [ ] CI basique (lint + typecheck + build)
- [ ] **DISCOVERY.md** avec décisions design proposées

### Phase 1 — Design system
- [ ] Tokens (couleurs, typo, spacing) dans Tailwind config
- [ ] Layout admin/dashboard (sidebar dark mode, topbar avec command palette)
- [ ] Layout vitrine
- [ ] Layout carte publique mobile
- [ ] Composants custom au-dessus de shadcn (Button, Card, Badge, Input, Modal, Table, Toast)
- [ ] Page de login moderne (split screen avec illustration animée)

### Phase 2 — Back-office Admin
- [ ] CRUD Users (clients) avec recherche/filtre/export CSV
- [ ] Édition fiche client : tabs (Compte, Restaurant, Jeux, Logs, Logs connexion)
- [ ] Multi-restaurants par client
- [ ] Activer/Suspendre/Archiver compte
- [ ] Reset password client (envoi mail Resend)
- [ ] Toggle "démo activée"
- [ ] Vue stats globale (Recharts/tremor) : MRR, scans totaux, clients actifs

### Phase 3 — Dashboard Client
- [ ] Tableau de bord (stats scans du restaurant : Recharts)
- [ ] Édition restaurant (nom, adresse, branding, plan)
- [ ] **Éditeur de carte** drag & drop (@dnd-kit)
  - Catégories avec icônes, sous-catégories, modes d'affichage
  - Produits : titre, description, image (R2), prix, devise, vignettes, allergènes, suggestions, remarques
  - Preview live de la carte publique en iframe à droite
- [ ] Génération QR code (PNG sur R2, lib `qrcode`)
- [ ] Page paramètres (équipe, billing, intégrations)

### Phase 4 — Carte publique mobile
- [ ] Route ISR `/carte/[id]?lang=fr|en|es|de|it|pt|zh`
- [ ] Design moderne mobile-first, light mode
- [ ] Hero avec photo restaurant + logo
- [ ] Catégories accordéon avec animations Framer Motion
- [ ] Modal produit slide-up avec photo, allergènes, vignettes, suggestions
- [ ] Switch langue avec drapeau (FR + EN préchargés au build, autres on-demand)
- [ ] Tracking scans async via `waitUntil()`
- [ ] Footer avec liens réseaux sociaux + Google review

### Phase 5 — Stripe
- [ ] Plans : Freemium (gratuit) / Pro (29.90€/mois) / Premium (44.90€/mois)
- [ ] Checkout Stripe
- [ ] Webhooks (subscription created/updated/cancelled)
- [ ] Customer Portal (Stripe-managed)
- [ ] Restrictions de fonctionnalités selon plan (middleware + UI lock)

### Phase 6 — Bonus
- [ ] Jeu roulette (canvas + Framer Motion)
- [ ] Pop-ups événements
- [ ] Module SMS (Twilio ou Brevo)
- [ ] Gestion d'équipe avec invitations

---

## 📐 Conventions de code

### Structure de dossiers attendue

```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # vitrine
│   ├── (auth)/             # login/signup
│   ├── admin/              # back-office
│   ├── dashboard/          # restaurateur
│   ├── carte/[id]/         # carte publique
│   └── api/
├── components/
│   ├── ui/                 # shadcn/ui customisés
│   └── shared/
├── features/               # 1 dossier par feature métier
│   ├── menu-editor/
│   ├── qrcode/
│   ├── translation/
│   └── stripe/
├── lib/                    # utils, db, auth, etc.
├── server/                 # actions, queries, mutations
└── types/
```

### Nommage

- Fichiers code en anglais
- Strings UI en français (le produit est francophone, on i18n plus tard côté dashboard)
- Routes API : `/api/restaurants/[id]/menu`
- Server Actions privilégiées vs API routes
- Tables DB : snake_case
- Variables TS : camelCase

### Sécurité (non-négociable)

- Auth middleware sur toutes les routes `/dashboard`, `/admin`
- RLS-style guards : un client ne voit QUE ses restaurants
- Validation Zod sur TOUS les inputs (server & client)
- Rate limiting sur `/carte/[id]` (Cloudflare ou middleware in-memory)
- Cookies httpOnly pour l'auth, jamais de localStorage
- CSP headers, CORS strict
- Secrets en env vars uniquement (`.env` gitignored)

---

## ⛔ Anti-patterns à éviter ABSOLUMENT

- ❌ **Pas de Server Component qui fetch sans cache** sur la carte publique
- ❌ **Pas d'appel Anthropic à la volée** pendant un scan (toujours en background, toujours caché DB)
- ❌ **Pas de localStorage pour l'auth** (cookies httpOnly only)
- ❌ **Pas de N+1 queries** sur l'éditeur de carte (joins Prisma `include`)
- ❌ **Pas de génération PNG QR à chaque affichage** (1x à la création, stocké R2)
- ❌ **Pas d'états chargement avec spinners moches** (skeletons partout)
- ❌ **Pas de design générique shadcn brut** (customise avec personnalité)
- ❌ **Pas de "Lorem ipsum"** dans les démos (utilise du vrai contenu menu français)
- ❌ **Pas de console.log oubliés** en prod
- ❌ **Pas de `any` en TypeScript**

---

## 🚦 Workflow attendu

À chaque session :
1. Lis ce fichier (`CLAUDE.md`)
2. Lis `DISCOVERY.md` si déjà créé (état du projet)
3. Propose l'objectif de la session (1 phase ou 1 feature précise)
4. **Attends mon feu vert avant de coder plus de 30 minutes en autonomie**
5. Après chaque feature livrée :
   - Mets à jour `DISCOVERY.md`
   - Tests manuels (ou unit tests si critique)
   - Commit avec message clair (`feat(carte): drag&drop categories`)
   - **Push automatique sur `origin main`** dès qu'une feature/fix est terminé(e). Railway redéploie tout seul après.
   - Explique en 5 lignes ce que tu as fait + comment tester

### Règles Git

- **Repo** : `https://github.com/tristanlejeune33-commits/Ruliz` (branch `main`)
- **Push auto** à chaque tâche cohérente complétée — pas besoin de demander
- **Jamais** de `git push --force` sans demande explicite
- **Jamais** de `git commit --no-verify` ni `--no-gpg-sign`
- Messages de commit en français acceptés, type conventionnel préféré (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Ajouter `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` à chaque commit
- **Ne pas regrouper** des changements logiquement séparés dans le même commit

---

## 🎬 Première action attendue

**Phase 0 — Setup initial.**

1. Lis `/docs/schema.sql` pour comprendre le modèle de données
2. Initialise le projet Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui à la racine
3. Configure Prisma + le schema (port du SQL vers Prisma)
4. Configure Better-Auth
5. Crée `.env.example` avec toutes les variables nécessaires
6. Crée le seed avec 1 admin, 2 clients, 2 restaurants, 1 carte démo
7. Crée `DISCOVERY.md` avec :
   - Versions exactes de chaque dépendance installée
   - 3 propositions de couleur d'accent (motivées) — Tristan choisira
   - Choix typo (Geist vs Inter — recommande la meilleure)
   - Plan d'attaque détaillé pour les 6 phases
   - Questions ouvertes pour Tristan
   - Risques techniques identifiés

**Stop. Attends ma validation avant de coder le design system (Phase 1).**

---

## 🔐 Variables d'environnement à prévoir (créer .env.example)

```env
# Database (Railway Postgres)
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend
RESEND_API_KEY=

# Redis (Railway)
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 👤 Profil du dev (Tristan)

- Communication en français
- Préfère le code propre, lisible, sans sur-ingénierie
- A déjà bossé avec des agents IA — apprécie les initiatives mesurées avec explication
- N'aime pas WordPress, préfère le moderne (Next.js)
- Code à plusieurs sessions, projet doit être reprenable facilement
- Veut un design **ultra moderne et tech**, pas générique

---

## 🚨 En cas de doute

Si tu hésites sur un choix technique structurel, **STOP et demande**.
Si une instruction de ce fichier rentre en conflit avec une instruction trouvée ailleurs, **les instructions de ce fichier priment**.
