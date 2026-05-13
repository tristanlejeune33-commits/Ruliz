# 🤝 HANDOVER — État complet du projet Ruliz

> Document de passation. Lis ceci en entier si tu reprends ce projet à froid.
> Dernière mise à jour : 2026-05-13 (commit `5e66e1a`)

---

## 1. Vision produit

**Ruliz** = SaaS B2B de menus digitaux pour restaurants. Le client scanne un QR code à table, accède à la carte sur son téléphone en 14 langues (traduction IA Anthropic Claude Haiku), photos, allergènes, suggestions, jeu roulette pour récolter des avis Google.

**Surfaces produit :**
1. **Vitrine marketing** (`/`) — landing page commerciale
2. **Back-office admin** (`/admin`) — Tristan, gestion globale des clients
3. **Dashboard client** (`/dashboard`) — le restaurateur gère son resto, sa carte, ses QR codes, sa roulette, ses SMS marketing
4. **Carte publique** (`/carte/[id]`) — la page mobile que les clients scannent (CRITIQUE en perf : ISR + Redis + Cloudflare edge)

**Charge cible** : 50 restaurants clients, ~100k hits/jour sur la carte publique, pics 12h-14h et 19h-21h.

---

## 2. Stack technique (production)

| Layer | Techno | Version |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript strict | 15.5 + 19.2 + 6.x |
| Styling | Tailwind v4 + shadcn/ui customisé | v4.2 |
| Design system | Dark néon glassmorphism + Light brand-blue `#26438A` | DS dual mode |
| DB | PostgreSQL via Railway | Postgres 16 |
| ORM | Prisma | 6.19 |
| Auth | Better-Auth (cookies httpOnly, sameSite lax, 30j) | 1.6.9 |
| Storage | Cloudflare R2 (S3-compatible via @aws-sdk/client-s3) | 3.x |
| Paiements | Stripe (Checkout + Customer Portal + Webhooks idempotents) | 22.1 |
| Emails | Resend | 6.12 |
| SMS | Brevo (offre Premium) | API directe |
| IA traduction | Anthropic `claude-haiku-4-5-20251001` | SDK 0.95 |
| Cache | Redis ioredis + in-memory hybride | 5.10 |
| Background jobs | Inngest + `after()` fallback Next.js | 4.3 |
| Monitoring | Sentry + Railway logs | — |
| Package mgr | pnpm | 11.0.8 |
| Hosting | Railway (App + Postgres + Redis) | Node 22 LTS |

---

## 3. Architecture Railway

**3 services Railway dans 1 projet :**

1. **App** (Next.js standalone)
   - Build : `nixpacks.toml` → `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
   - Start : `pnpm db:deploy:prod && pnpm start` (= `prisma migrate deploy && next start`)
   - Node 22 LTS pinned (Node 24 default casse Corepack + pnpm)
   - Healthcheck : `/api/health` (timeout 30s, restart 3× sur failure)
2. **Postgres** (Railway managed)
3. **Redis** (Railway managed)

**Domaine custom** : `ruliz-panel.fr` (chez Hostinger). Setup :
- ALIAS `@` → `yks2zg50.up.railway.app` (target Railway)
- TXT `_railway-verify` → token donné par Railway
- CNAME `www` → `ruliz-panel.fr`

**Env vars critiques** (Railway → Variables) :
```
DATABASE_URL=postgresql://... (auto-injecté Railway)
REDIS_URL=redis://... (auto-injecté Railway)
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=https://ruliz-panel.fr
NEXT_PUBLIC_APP_URL=https://ruliz-panel.fr
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
RESEND_API_KEY=re_...
MAIL_FROM=Ruliz <contact@ruliz-panel.fr>
BREVO_API_KEY=
BREVO_SMS_SENDER=Ruliz
ADMIN_DEMO_EMAIL=tristanlejeune33@gmail.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 4. Architecture base de données

**Auth (Better-Auth, tables séparées du domaine)** : `auth_user`, `auth_session`, `auth_account`, `auth_verification`.

**Domaine métier** : `users` (Tristan = admin, autres = client/team), `team_members`, `restaurants` (1 user → N restaurants, chacun avec son propre abonnement Stripe), `qrcodes`, `categories` (avec parent_id pour sous-cats), `produits`, `vignettes`, `produit_vignettes`, `allergenes`, `produit_allergenes`, `produit_suggestions`, `produit_translations`, `categorie_translations`.

**Stats** : `scans` (partitionnée par date), `logs`.

**Boutique QR** : `boutique_produits`, `boutique_commandes`, `boutique_commande_items`, `boutique_shipping_tiers` (9 paliers Colissimo France).

**SMS** : `sms_balance` (1 par resto), `sms_credit_purchases`, `sms_messages`, `sms_campaigns`.

**Stripe idempotence** : `stripe_processed_events` (anti-replay des webhooks).

**Onboarding tour** : champs `onboarding_*` sur `users`.

**Mode démo admin** : restaurant créé pour le compte admin, distinct des clients réels. Cookie `ruliz_admin_demo=1` + cookie `ruliz_active_restaurant`. Voir `src/lib/admin-demo.ts`.

**Migration runtime** : `src/lib/ensure-runtime-schema.ts` est appelée au boot du dashboard layout. Elle fait des `ALTER TABLE IF NOT EXISTS ADD COLUMN` pour patcher les colonnes ajoutées tardivement (anti-drift en prod sans devoir relancer `prisma migrate deploy`).

---

## 5. Features livrées (Phases 0 → 7)

### Phase 0-1 — Setup & Design system
- Next 15 + Tailwind v4 + shadcn/ui custom
- DS dual mode (dark néon `--neon-cyan` + light brand `#26438A`)
- Logo Ruliz wordmark + mark dans `/public/brand/`
- Geist Sans/Mono fonts
- Layout admin/dashboard avec sidebar + topbar + Cmd+K command palette
- Auth Better-Auth multi-rôle (admin/client/team)

### Phase 2 — Back-office admin
- CRUD clients avec recherche/filtre/export CSV
- Multi-restaurants par client
- Suspend/Archive/Reset password
- Stats globales (Recharts) : MRR, scans, clients actifs
- Logs, factures, boutique
- **Mode démo admin** (`/admin/demo`) : crée un Bistrot Ruliz fictif pour démos prospects, avec 25 plats, jeu roulette, 2 pop-ups. Bouton "Régénérer la démo" pour reset complet.
- **Test emails** (`/admin/email-test`) : 6 templates testables en 1 click

### Phase 3 — Dashboard client
- Tableau de bord stats scans (Recharts : timeseries, donut langues, KPI bento)
- Édition restaurant : nom, adresse, branding (logo, bannière, couleurs), réseaux sociaux, horaires de service (lunch/dinner/happy hour)
- Éditeur de carte drag&drop (@dnd-kit) — catégories avec sous-cats, produits, vignettes, allergènes, suggestions
- QR codes (PNG R2 généré au save via `qrcode` npm)
- Roulette d'avis (canvas + Framer Motion)
- Pop-ups événements
- SMS marketing (Brevo)
- Boutique QR/stickers (commandes payées via Stripe, 9 paliers Colissimo)
- Équipe (invitations email)
- Settings (profil, billing, factures, legal)

### Phase 4 — Carte publique mobile
- Route ISR `/carte/[id]?lang=fr|en|es|de|it|pt|zh|...` (14 langues)
- Cache 4 niveaux : Cloudflare edge → ISR Next → Redis → DB
- Traduction Anthropic cachée DB à vie (table `produit_translations` + `categorie_translations`)
- Auto-heal traductions via `after()` si partielle
- Modal produit slide-up avec photos, allergènes, vignettes, suggestions
- Switch langue avec drapeaux flagcdn.com
- Tracking scans async via `waitUntil()`
- Footer réseaux sociaux + lien avis Google

### Phase 5 — Stripe
- 3 plans : Freemium (gratuit) / Pro (29.90€ HT/mois) / Premium (44.90€ HT/mois)
- **1 abonnement par restaurant** (pas par user) — `metadata.ruliz_restaurant_id` sur chaque subscription
- Webhooks idempotents via `stripe_processed_events`
- Customer Portal Stripe pour gérer abo
- Boutique : Stripe Checkout `payment` mode + invoice PDF auto
- SMS : Stripe Checkout `payment` mode + crédit du pack au webhook

### Phase 6 — Bonus
- Jeu roulette d'avis Google (canvas + lots probabilistes)
- Pop-ups événements (horaires + jours actifs bitmap)
- SMS marketing avec base clients + campagnes
- Module impersonation admin SAV (cookie `ruliz_impersonate_user_id`, TTL 1h)

### Phase 7 — Avancé & hardening
- **GDPR** : self-service `/dashboard/settings` → "Supprimer mon compte" + variante admin. Anonymise PII, cancel Stripe subs, purge R2 images, hard-delete AuthUser. Conserve factures (10 ans légal).
- **Compression images** Canvas adaptive (Logo PNG lossless, Bannière JPEG 90%, Produit/Boutique JPEG 88%, QR raw)
- **Delete-on-replace R2** + cleanup orphelins > 30 jours (`/admin/settings` → R2 Cleanup)
- **Security hardening** : CSP + HSTS, rate-limit Redis cross-instance `/carte/*` 60req/min, idempotence webhooks, diag endpoint gated admin, impersonation TTL réduite
- **Pages légales** : `/legal/mentions-legales` + `/legal/politique-confidentialite`

### Récents (2026-05-13)
- **Page de connexion refondue** : split 2-col, eyebrow + headline + toggle œil + banner inline, phone preview live avec carte démo Bistrot Ruliz
- **Page `/forgot-password` + `/reset-password`** complètes via Better-Auth `requestPasswordReset` + `resetPassword`
- **Login redirect par rôle** : admin → `/admin`, client → `/dashboard` (via `getPostLoginUrl()`)
- **Emails refondus** avec template maître `src/lib/email-template.ts` (logo, branding bleu, footer légal). 6 templates : welcome, reset, team-invite, boutique-confirm, boutique-paid, sms-pack, jeu-gain
- **Confirmation achat SMS / boutique payée** via webhook Stripe
- **Tarifs Colissimo France 01/04/2026** : 9 paliers officiels La Poste mis à jour avec migration intelligente (respecte le custom admin)
- **Bug Happy Hour fix** : colonnes `lunch_start/end`, `dinner_start/end`, `happy_hour_start/end` ajoutées dans `ensure-runtime-schema.ts` (manquaient en prod → save silencieusement KO)
- **MRR exclu compte démo admin** : queries `stats.ts` filtrent `user.role != 'admin'` pour ne pas gonfler le MRR avec le resto Bistrot Ruliz

---

## 6. Setup déploiement en cours

### ✅ Fait
- Domaine `ruliz-panel.fr` acheté Hostinger
- DNS Hostinger configurés (ALIAS + TXT verify Railway)
- Railway Custom Domain ajouté
- Le site répond sur `https://ruliz-panel.fr`

### ⏳ En cours / À faire
1. **Resend domaine** : créer compte Resend, ajouter `ruliz-panel.fr`, configurer DNS (SPF + DKIM + DMARC) chez Hostinger, vérifier dans Resend, copier API key
2. **Env vars Resend dans Railway** :
   - `RESEND_API_KEY=re_xxx`
   - `MAIL_FROM=Ruliz <contact@ruliz-panel.fr>` (ou autre adresse choisie)
3. **Stripe webhook URL** : mettre à jour vers `https://ruliz-panel.fr/api/stripe/webhook` (dashboard Stripe → Developers → Webhooks)
4. **Stripe receipts auto** : activer dans Settings → Business Settings → Customer emails → "Successful payments" + "Refunds"
5. **Test emails** : aller sur `https://ruliz-panel.fr/admin/email-test` et click "Envoyer tous les emails (6×)" pour valider la chaîne complète
6. **Click "Ma carte démo"** dans sidebar admin pour créer le Bistrot Ruliz

### 🔮 Optionnels (à voir avec user)
- Archive locale des factures (table `invoices_archive` + R2 PDF backup, voir section 9)
- Email renouvellement abonnement (actuellement Stripe envoie son invoice, pas d'email Ruliz brandé)
- Variantes Chronopost / Outre-mer dans la boutique (actuellement Colissimo France uniquement)

---

## 7. Conventions de code

### Structure
```
src/
├── app/
│   ├── (marketing)/        # vitrine + legal
│   ├── (auth)/             # login, signup, forgot-password, reset-password
│   ├── admin/              # back-office
│   ├── dashboard/          # restaurateur
│   ├── carte/[id]/         # carte publique mobile
│   └── api/                # health, stripe webhook, upload R2, etc.
├── components/
│   ├── ui/                 # shadcn customisé
│   └── shared/             # AppShell, Sidebar, Topbar, etc.
├── features/               # 1 dossier par feature métier (menu-editor, etc.)
├── lib/                    # utils, db, auth, redis, r2, email-template, etc.
├── server/                 # server actions (1 fichier par scope : admin/, dashboard/, auth/, public/, sms/, boutique/, billing/)
└── types/
```

### Règles
- Fichiers code en **anglais**, strings UI en **français**
- Routes API préférées : `/api/<scope>/<action>`
- **Server Actions** privilégiées vs API routes
- Tables DB **snake_case**, variables TS **camelCase**, Prisma map via `@map`
- Validation **Zod** sur TOUS les inputs (server + client)
- Cookies **httpOnly** uniquement (jamais localStorage pour auth)
- **Pas de `any`** TypeScript
- **Pas de console.log** oubliés
- **Skeletons** pendant chargement (jamais spinners moches)
- **Toasts Sonner** pour feedback utilisateur

### Git
- Repo : `https://github.com/tristanlejeune33-commits/Ruliz`
- Branch : `main`
- **Push auto** à chaque tâche complétée. Railway redéploye tout seul.
- **Jamais** `--no-verify`, `--no-gpg-sign`, `git push --force` sans demande explicite
- Co-author commit : `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Messages : `feat:` / `fix:` / `chore:` / `docs:` / `refactor:`

---

## 8. Système email (refonte récente)

**Template maître** : `src/lib/email-template.ts`
- `emailLayout({ title, eyebrow, preheader, body, cta, footnote })` — wrapper avec logo Ruliz, card centrée 600px, footer légal
- Helpers : `lead()`, `p()`, `infoBox()`, `successBox()`, `warnBox()`, `dangerBox()`, `code()`, `hero({emoji, title})`, `itemsTable()`, `totalRow()`, `dataTable()`
- Inline styles obligatoires (Gmail/Outlook strip `<style>`)
- Compat tables, hex colors, color-scheme light only

**Envois** :
- `lib/auth.ts` → reset password (Better-Auth callback)
- `server/dashboard/team-actions.ts` → invitation équipe
- `server/boutique/emails.ts` → confirmation commande client + notif admin
- `server/sms/emails.ts` (NEW) → confirmation pack SMS payé + confirmation boutique payée
- Trigger : webhooks Stripe (`/api/stripe/webhook`) best-effort après succès opération
- `server/admin/email-test-actions.ts` → 6 templates testables via `/admin/email-test`

**Tarifs Resend** : 100 emails/jour gratuit, 20$/mois pour 50k.

---

## 9. Facturation (état actuel)

**Source de vérité** : Stripe (PDF officiel hostés)
**Notre DB stocke** :
- `sms_credit_purchases` (toutes les transactions SMS, métier)
- `boutique_commandes` + `boutique_commande_items`
- `stripe_processed_events` (idempotence)
- `users.stripeCustomerId`, `restaurants.stripeSubscriptionId`

**Page user** : `/dashboard/settings/factures` — fetch à la volée Stripe via `stripe.invoices.list({customer})` + enrichissement DB pour SMS/boutique.

**À améliorer (si user le demande)** :
1. Table `invoices_archive` qui snapshot toutes les factures (méta-data) → archive comptable locale 10 ans
2. Téléchargement PDF Stripe + stockage R2 (`r2://invoices/{userId}/{invoiceNumber}.pdf`) → autonomie totale vs Stripe

**Obligation légale FR** : 10 ans conservation des factures (article L123-22 Code de commerce). Aujourd'hui on respecte via Stripe + nos métadonnées DB, mais pas d'archive locale du PDF.

---

## 10. Comptes seed / démo

**Admin Tristan** :
- Email : `tristanlejeune33@gmail.com`
- Role : `admin`
- Carte démo : Bistrot Ruliz (Bordeaux, plan premium)
- Page demo regen : `/admin/demo?force=1` ou bouton "Régénérer la démo" dans bandeau

**Clients seed (pour dev local)** :
- `marie.dubois@tirebouchon.fr` — Le Tire-Bouchon, Bordeaux
- `pierre.martin@chezpierre.fr` — Chez Pierre

**Cartes test** :
- Bistrot Ruliz (démo admin) : 6 catégories dont 3 sous-catégories sous "Plats", 25 produits avec photos Unsplash, vignettes, allergènes, suggestions, jeu roulette 5 lots, 2 pop-ups
- Le Tire-Bouchon (client seed)

---

## 11. Bugs récents fixés

| Bug | Commit | Cause | Fix |
|---|---|---|---|
| Happy Hour pas sauvegardé | `68e25ec` | Colonnes `lunch_start` etc. manquantes en prod (pas dans `ensure-runtime-schema.ts`) | `ALTER TABLE ADD COLUMN IF NOT EXISTS` ajouté |
| Drapeaux switch langue cassés (alt text "Dra FR") | `87dd6dd` | CSP `img-src` ne whitelist pas `flagcdn.com` | Ajout flagcdn + Unsplash + Pexels au CSP + remotePatterns |
| Nav sidebar admin "Ma carte démo" renvoie /admin | `b7dcc96` | `<Link>` Next fait SPA RSC fetch sur Route Handler → cookies perdus | Passage à `<a>` natif (full page reload) |
| Mode démo créait juste 2 produits | `1a78f3f` | Seed initial pauvre | Seed Bistrot Ruliz complet (5 catégories × 4 plats + vignettes + allergènes + suggestions + sous-cats + jeu + pop-ups) |
| Login admin redirigeait sur /dashboard mode démo | `b25062a` | `ruliz_admin_demo` cookie traînait, login pas role-aware | `clearSessionCookies` clear aussi `ruliz_admin_demo` + nouvelle action `getPostLoginUrl` |
| `prisma.scan.groupBy` crash "Unknown argument restaurant" | `0c485d4` | Modèle `Scan` n'a pas de relation Prisma typée, juste FK `restaurantId` | Pré-fetch `adminRestoIds`, filter via `restaurantId: {notIn: ids}` |
| Auto-save silencieusement échouait | `68e25ec` | Idem Happy Hour | Idem |
| Spam logs Redis sur prod | `8c6991c` | `redis.status === "end"` mais on tentait quand même les commandes | Check status avant chaque call, fallback DB silencieux |
| Page Pop-ups vide après upgrade démo | `5657972` | Code idempotent skip si ≥8 produits, mais nouveau seed a jeu+popup en plus | Condition "≥8 produits ET ≥1 jeu ET ≥1 popup" sinon régénération forcée |

---

## 12. Commandes utiles (dev local)

```bash
# Install
pnpm install

# Dev server
pnpm dev

# Typecheck
pnpm typecheck

# Lint
pnpm lint

# DB
pnpm db:generate              # Prisma generate
pnpm db:migrate               # Prisma migrate dev
pnpm db:deploy                # Prisma migrate deploy (local)
pnpm db:deploy:prod           # Prisma migrate deploy (prod sans dotenv)
pnpm db:studio                # Prisma Studio GUI
pnpm db:reset                 # Drop + reseed
pnpm seed                     # Seed seul

# Tests externes
pnpm test:anthropic           # Test Anthropic API
pnpm test:r2                  # Test R2 (upload + delete)
```

---

## 13. Comment continuer en tant qu'autre agent

1. **Lis `CLAUDE.md`** (instructions projet) + ce fichier + `DISCOVERY.md`
2. **Vérifie l'état git** : `git -C /c/dev/ruliz status` + `git log --oneline -10`
3. **Pull les derniers commits** si tu reprends après pause longue
4. **Tu travailles dans `C:\dev\ruliz`** (pas dans `.claude/worktrees/...` ni ailleurs)
5. **Push immédiat** après chaque commit cohérent (CLAUDE.md le demande)
6. **Pour les questions exploratoires** : 2-3 lignes avec recommandation. Pour les actions : fais, push, raconte en 5 lignes ce que t'as fait
7. **Variables d'env** : ne hardcode jamais. Lis depuis `process.env.XXX` avec fallback explicite si dev local
8. **Migrations** : préfère ajouter à `src/lib/ensure-runtime-schema.ts` (ALTER TABLE IF NOT EXISTS) plutôt que créer une nouvelle migration Prisma (plus safe en prod Railway sans downtime)
9. **Si Railway n'a pas redéployé après push** : vérifier le dashboard Railway → Deployments. Build peut échouer (typecheck, build error, etc.)
10. **Tristan parle français**, code propre sans sur-ingénierie, design ultra moderne tech (Linear/Vercel/Resend vibe)

---

## 14. Anti-patterns à éviter

- ❌ Server Component qui fetch sans cache sur `/carte/[id]`
- ❌ Appel Anthropic à la volée pendant un scan (toujours background + cache DB à vie)
- ❌ `localStorage` pour l'auth (cookies httpOnly only)
- ❌ N+1 queries sur l'éditeur de carte (joins Prisma `include`)
- ❌ Génération PNG QR à chaque affichage (1× à la création, stocké R2)
- ❌ Spinners moches (skeletons partout)
- ❌ Design générique shadcn brut (customise avec personnalité)
- ❌ `console.log` oubliés en prod
- ❌ `any` en TypeScript
- ❌ Push direct sur main si feature non testée (mais main est OK pour les fixes ciblés)
- ❌ Modifier `prisma migrate` en prod sans `ensure-runtime-schema.ts` fallback
- ❌ Hardcode d'URL absolues construites avec `request.url` dans les route handlers (sur Railway = port interne 8080 → utiliser path relatif `redirect("/dashboard")` ou `x-forwarded-host`)

---

## 15. Contact & repo

- **Repo GitHub** : https://github.com/tristanlejeune33-commits/Ruliz
- **Branch** : `main`
- **Domaine prod** : https://ruliz-panel.fr
- **Hostinger** (DNS) : hpanel.hostinger.com
- **Railway** : railway.app (projet Ruliz)
- **Stripe** : dashboard.stripe.com (mode TEST + LIVE)
- **Resend** : resend.com (à finaliser)
- **Cloudflare R2** : configuré
- **Sentry** : à activer si besoin

**Tristan** : tristanlejeune33@gmail.com (admin du panel + email perso)

---

## 16. Last 10 commits (pour situer)

```
5e66e1a feat(shipping): tarifs Colissimo France officiels au 01/04/2026
f2d70b8 feat(emails): confirmation achat SMS + boutique payée via webhook Stripe
72ac92d feat(emails): refonte complète avec logo Ruliz + branding bleu signature
68e25ec fix(schema): colonnes horaires manquantes — happy hour ne se sauvegardait pas
44c8c63 feat(admin): page Test Emails — envoi de tous les templates en 1 click
b25062a feat(auth): forgot/reset password + redirect admin + carte démo email + CGV roulette
0c485d4 fix(admin/stats): Scan n'a pas de relation Prisma vers Restaurant
04ee980 fix(admin/stats): exclu les restaurants démo admin du MRR et des KPIs
3dd949f feat(admin-demo): bouton "Régénérer la démo" + param ?force=1
b7dcc96 fix(admin-demo): full page nav vers les route handlers (cookies + redirect)
```

---

**Si tu as un doute** : lis le commit en question (`git -C /c/dev/ruliz show <sha>`) pour voir exactement ce qui a été fait et pourquoi (les messages sont explicites avec le "Cause" + "Fix").

Bonne suite ! 🚀
