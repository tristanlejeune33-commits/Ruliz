# 🍽️ Ruliz — SaaS de menus digitaux

SaaS B2B pour restaurateurs : menus digitaux multi-langues consultables via QR code, avec traduction IA, gestion d'équipe, jeu d'avis Google.

## Stack

- **Framework** : Next.js 15 + TypeScript + Tailwind v4
- **DB** : PostgreSQL via Railway + Prisma
- **Auth** : Better-Auth (multi-rôle)
- **IA** : Anthropic Claude API (traduction)
- **Storage** : Cloudflare R2
- **Paiements** : Stripe
- **Hosting** : Railway

## Setup local

```bash
pnpm install
cp .env.example .env
# Remplir les variables d'env
pnpm prisma migrate dev
pnpm seed
pnpm dev
```

## Roadmap

- [x] **Phase 0** : Setup (Next.js, Prisma, Auth, seed)
- [ ] **Phase 1** : Design system
- [ ] **Phase 2** : Back-office Admin
- [ ] **Phase 3** : Dashboard Client + éditeur de carte
- [ ] **Phase 4** : Carte publique mobile (perf)
- [ ] **Phase 5** : Stripe (Freemium / Pro / Premium)
- [ ] **Phase 6** : Bonus (jeu, popups, SMS, équipe)

## Architecture cache (carte publique)

```
Cloudflare edge (60s)
  → ISR Next.js (revalidate 60s)
    → Redis Railway (clé carte:{id}:{lang})
      → Postgres (table produit_translations cachée à vie)
```

## Documentation

- `CLAUDE.md` — brief complet du projet (lu auto par Claude Code)
- `docs/schema.sql` — schéma DB complet
- `DISCOVERY.md` — état du projet (généré par Claude Code)

## Pour Claude Code

À chaque session, l'agent doit lire :
1. `CLAUDE.md` (brief)
2. `DISCOVERY.md` (état)
3. Proposer l'objectif de session
4. Attendre validation avant exécution longue
