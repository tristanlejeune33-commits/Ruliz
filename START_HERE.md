# 🚀 START HERE — Comment démarrer Ruliz avec Claude Code

## Étape 1 : Place ce dossier où tu veux

Recommandé : **hors de OneDrive**, dans `C:\Users\trist\dev\ruliz\`

## Étape 2 : Init Git dans le dossier

Ouvre PowerShell, va dans le dossier et lance :

```powershell
cd C:\Users\trist\dev\ruliz
git init
git add .
git commit -m "chore: initial brief and schema"
```

## Étape 3 : Lance Claude Code

```powershell
claude
```

Le navigateur s'ouvre pour l'auth → tu te logges avec ton compte Claude Pro/Max → retour terminal.

## Étape 4 : Colle ce premier prompt

```
Salut Claude Code ! Lis d'abord CLAUDE.md à la racine, c'est ton brief complet pour cloner Ruliz from scratch (sans template).

Lance la Phase 0 (Setup) :

1. Lis /docs/schema.sql pour comprendre le modèle de données
2. Initialise le projet Next.js 15 + TS + Tailwind v4 + shadcn/ui à la racine
3. Configure Prisma + porte le schema SQL en schema.prisma
4. Configure Better-Auth (multi-rôle admin/client/team)
5. Crée .env.example avec toutes les variables
6. Crée le seed avec 1 admin, 2 clients, 2 restaurants, 1 carte démo "Le Tire-Bouchon"
7. Crée DISCOVERY.md à la racine avec :
   - Versions exactes installées
   - 3 propositions de couleur d'accent (motivées)
   - Choix typo (Geist vs Inter)
   - Plan d'attaque détaillé pour les 6 phases
   - Questions ouvertes pour moi (Tristan)
   - Risques techniques

Important :
- NE CODE PAS le design system maintenant, on en discute après ton DISCOVERY.md
- Si t'as un doute, demande
- Attends mon GO avant Phase 1

Vas-y.
```

## Étape 5 : Pendant que Claude Code travaille

Crée tes comptes services en parallèle (gratuits) :

- **Railway** : https://railway.app (DB + Redis + hosting)
- **Anthropic Console** : https://console.anthropic.com (API key pour traduction)
- **Stripe** : https://stripe.com (mode test)
- **Cloudflare** : https://cloudflare.com (R2 pour images)
- **Resend** : https://resend.com (emails)

## Étape 6 : Quand DISCOVERY.md est prêt

Reviens dans la conversation Claude (l'app, ici), et copie-colle le contenu de `DISCOVERY.md`. Je t'aiderai à :
- Choisir la couleur d'accent
- Valider la stack
- Préparer le prompt de Phase 1

## ⚠️ Si tu bloques

- **`claude` non reconnu** : ferme/rouvre PowerShell après l'install, ou ajoute `~/.local/bin` au PATH
- **Erreurs npm/pnpm** : vérifie que Node.js 18+ est installé (`node --version`)
- **Permissions Windows** : essaie de relancer PowerShell en admin

Bon code 🚀
