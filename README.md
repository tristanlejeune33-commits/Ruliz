# 🍽️ Ruliz — SaaS de menus digitaux

SaaS B2B français pour restaurateurs : menus digitaux multi-langues consultables via QR code, avec traduction IA (Anthropic Claude), photos, allergènes, jeu d'avis Google et **pipeline d'acquisition cold email automatisé**.

**Prod** : https://ruliz-panel.fr · **Repo** : https://github.com/tristanlejeune33-commits/Ruliz

---

## 📚 Documentation

### Pour les agents IA qui reprennent le projet
👉 **[`AGENT.md`](./AGENT.md)** — Le doc unique à lire (architecture, features, conventions, pièges, roadmap).

### Documentation supplémentaire
| Fichier | Quand le lire |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Brief original du projet (vision, ton, anti-patterns) |
| [`HANDOVER.md`](./HANDOVER.md) | Historique passation (état 2026-05-13) |
| [`DISCOVERY.md`](./DISCOVERY.md) | Décisions design phase 0 (référence historique) |
| [`docs/schema.sql`](./docs/schema.sql) | Schéma DB initial (modèle de référence) |
| [`docs/design-system.md`](./docs/design-system.md) | DS dark néon (admin/dashboard) |
| [`docs/design-system-light.md`](./docs/design-system-light.md) | DS light brand-blue (auth/emails) |
| [`docs/design-system-mobile.md`](./docs/design-system-mobile.md) | DS carte publique mobile |
| [`docs/outreach-2000-architecture.md`](./docs/outreach-2000-architecture.md) | Architecture pipeline cold email (600 lignes) |
| [`docs/outreach-2000-runbook.md`](./docs/outreach-2000-runbook.md) | Runbook ops pour lancer la campagne 2k |

---

## 🛠️ Stack

```
Framework      : Next.js 15 + TS strict + Tailwind v4
DB             : PostgreSQL via Railway + Prisma 6
Auth           : Better-Auth (cookies httpOnly multi-rôle)
IA             : Anthropic Claude Haiku 4.5 (trad + OCR + AI marketer)
Storage        : Cloudflare R2 (CDN)
Paiements      : Stripe (Checkout + Customer Portal + Webhooks)
Emails         : Resend (transactionnel) + Smartlead.ai (cold outreach)
SMS            : Brevo
Cache          : Redis + ISR Next.js + Cloudflare edge (4 niveaux)
Jobs           : Inngest (workers + cron + retries)
Hosting        : Railway (App + DB + Redis)
```

---

## ✨ Features

### MVP en production
- [x] Auth multi-rôle (admin / client / team)
- [x] Back-office admin (clients, restos, factures, logs)
- [x] Dashboard restaurateur (carte drag&drop, QR codes, stats, équipe, SMS, popups, roulette)
- [x] Carte publique mobile ISR 7 langues (cache 4 niveaux)
- [x] Stripe Freemium / Pro (29,90 €) / Premium (44,90 €)
- [x] Boutique QR/stickers (Stripe + Colissimo)
- [x] Emails refondus (template maître + 6 templates)
- [x] Mode démo admin (Bistrot Ruliz)
- [x] GDPR self-delete + archive factures 10 ans
- [x] Security hardening (CSP + HSTS + rate limit Redis)

### Pipeline d'acquisition (2026-05-15 → 18)
- [x] Filtrage 20k restaurants TripAdvisor → 2000 prospects qualité
- [x] Workers Inngest (validation email + scrape + Anthropic Vision OCR)
- [x] 12 variants emails A/B/C × 4 steps (J+0/J+3/J+7/J+14)
- [x] Page perso `/preview/[token]` avec carte pré-générée + CTA
- [x] Flow activation `/signup?prospect=token` (crée Restaurant atomiquement)
- [x] Email bienvenue post-activation
- [x] Webhook Smartlead `/api/outreach/event`
- [x] AI marketer Anthropic (génère variants + classifie replies)
- [x] Admin UI pilotage 100% web (upload CSV / seed / trigger / export)
- [ ] Achat domaines warmup + setup Smartlead (humain en cours)
- [ ] Lancement campagne 200 emails/jour (post-warmup 4 semaines)

---

## 🚀 Setup local (rare — préfère prod Railway)

```bash
pnpm install
cp .env.example .env
# Remplir les variables d'env (voir AGENT.md § 13)
pnpm prisma generate
pnpm prisma migrate deploy
pnpm seed
pnpm dev
```

---

## 🎯 Pour un nouvel agent IA

1. Lis **[`AGENT.md`](./AGENT.md)** en entier
2. Lis [`CLAUDE.md`](./CLAUDE.md) une fois pour le ton et les anti-patterns
3. Vérifie l'état git : `git -C /c/dev/ruliz status && git log --oneline -10`
4. Pull si pause longue
5. Propose l'objectif de session, attends validation si gros chantier
6. Push automatique après chaque feature cohérente (Railway redéploye seul)

---

## 📞 Contact

**Tristan Lejeune** — fondateur — [tristanlejeune33@gmail.com](mailto:tristanlejeune33@gmail.com)
