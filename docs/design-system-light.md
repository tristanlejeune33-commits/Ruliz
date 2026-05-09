# Ruliz — Design System Light Mode

> **Version** : 1.0 (variante light du DS Ruliz)
> **Statut** : ⏳ en attente de validation
> **Direction** : Light mode premium, éditorial, tech, calme. Bleu signature
>   `#26438A` comme **seul** accent. Discipline visuelle absolue.
> **Référence** : Linear (light), Vercel (light), Stripe Dashboard, Height, Attio.

Ce document définit les tokens, recipes et règles **spécifiques au light mode**.
Il complète `docs/design-system.md` (dark) — la structure de navigation, les
écrans, l'API des composants atomiques restent **identiques**. Seuls les
**tokens et certaines recipes utilities** changent. Les composants ne sont
pas modifiés (token-driven).

---

## 1. Direction artistique light

Pas un dark mode inversé. Pas un Bootstrap/Material 2018. La sensation cible :

- Une page Notion + une feuille de specs ingénieur Stripe.
- Du **blanc franc** (`#FFFFFF`) pour les surfaces actives, du **gris légèrement
  bleuté** (`#FAFBFD`) pour le canvas, des **ombres fines multi-couches** pour
  la profondeur (jamais lourdes).
- Le bleu `#26438A` est **ponctuel** : CTA primaire, focus ring, accent data,
  status dot, lignes de chart. Le reste vit en blanc + 5 niveaux de gris très
  proches.
- Pas de gradient bleu décoratif. Pas de glow. Pas de néon. Pas de violet, pas
  d'orange. **Un seul accent** = la signature.
- Typographie tendue (tracking -0.02em sur les titres, -0.01em sur les valeurs
  mono) → effet "datasheet" qu'aucun SaaS B2B ne fait correctement.

---

## 2. Tokens — palette light complète

### 2.1 Couleur signature

| Token CSS | Valeur | Usage |
|-----------|--------|-------|
| `--brand-blue` | `#26438A` | Source du bleu signature |
| `--brand-blue-hover` | `#1E3670` | Hover CTA primaire (-12%) |
| `--brand-blue-pressed` | `#162954` | Active state CTA primaire |
| `--brand-blue-tint` | `#EEF2FA` | Surfaces actives (sidebar, hover) |
| `--brand-blue-tint-strong` | `#D8E1F3` | Pills, chips, badges info |
| `--brand-blue-bright` | `#3D6BD6` | Charts highlights ponctuels (parcimonie) |

### 2.2 Backgrounds

| Token | Valeur | Usage |
|-------|--------|-------|
| `--bg-primary` | `#FFFFFF` | App background (canvas direct sous main) |
| `--bg-canvas` | `#FAFBFD` | Zone de contenu (off-white bleuté) |
| `--bg-surface` | `#FFFFFF` + border `#ECEFF5` | Cartes (= ce qu'on appelait `--bg-glass` en dark) |
| `--bg-surface-strong` | `#F6F8FC` | Sidebar, panels secondaires |
| `--bg-surface-hover` | `#F1F4FA` | Hover surfaces, item nav non-actif au hover |
| `--bg-active` | `#EEF2FA` | Item nav actif, sélections multiples |

### 2.3 Bordures

| Token | Valeur | Usage |
|-------|--------|-------|
| `--border-default` | `#ECEFF5` | Border standard cartes / inputs au repos |
| `--border-strong` | `#D8E1F3` | Border hover sur surfaces secondaires |
| `--border-focus` | `#26438A` | Border focus / active state |
| `--divider` | `#F1F4FA` | Séparateurs subtils dans listes, dropdowns |

### 2.4 Texte

| Token | Valeur | Contraste WCAG sur `#FAFBFD` |
|-------|--------|-------------------------------|
| `--text-primary` | `#0B1530` | 16.8:1 (AAA) |
| `--text-secondary` | `#4A5573` | 7.0:1 (AAA) |
| `--text-tertiary` | `#8892AB` | 3.4:1 (AA Large only — usage limité aux placeholders et labels micro) |
| `--text-on-brand` | `#FFFFFF` | sur fond `#26438A` (8.9:1 — AAA) |
| `--text-link` | `#26438A` | underline offset 3px au hover |

### 2.5 États sémantiques (sobres, jamais criards)

| Token | Foreground | Background | Usage |
|-------|------------|------------|-------|
| `--success-fg` / `--success-bg` | `#1A7F5A` | `#E6F4EE` | Toasts succès, badge actif |
| `--warning-fg` / `--warning-bg` | `#B25E09` | `#FCF1E2` | Alertes (paiement en retard, plan limité) |
| `--danger-fg` / `--danger-bg` | `#B91C3B` | `#FCE8EC` | Erreurs, suppressions |
| `--info-fg` / `--info-bg` | `#26438A` | `#EEF2FA` | Infos (mêmes que brand) |

### 2.6 Ombres (multi-couches, fines, jamais marketing)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--shadow-card` | `0 1px 2px rgba(11,21,48,0.04), 0 1px 3px rgba(11,21,48,0.04)` | Card resting |
| `--shadow-card-hover` | `0 4px 12px rgba(11,21,48,0.06), 0 2px 4px rgba(11,21,48,0.04)` | Card hover |
| `--shadow-modal` | `0 24px 48px rgba(11,21,48,0.12), 0 8px 16px rgba(11,21,48,0.08)` | Modale, dropdown élevé |
| `--shadow-focus` | `0 0 0 3px rgba(38,67,138,0.18)` | Focus ring (remplace les glows néon du dark) |

**Règle absolue** : aucune ombre `rgba(0,0,0,...)`. On part toujours de la
teinte primaire `rgba(11,21,48,...)` pour préserver le ton bleuté du système.

### 2.7 Tokens identiques au dark (rappel — rien à modifier)

- Radii : `12px` (inputs/boutons), `16px` (cards), `24px` (modales), `8px` (chips), `9999px` (avatars/pills)
- Spacing : grille 4px (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64)
- Motion : `--ease-default: cubic-bezier(0.22, 1, 0.36, 1)`, `--dur-default: 240ms`, `--dur-page: 320ms`
- Typo : Geist Sans + Geist Mono (tracking -0.02em titres, -0.01em valeurs mono)

---

## 3. Recipes light-spécifiques

### 3.1 Mesh gradient signature (dashboard home **uniquement**)

```css
.ambient-bg-light {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -10;
  background:
    radial-gradient(at 20% 0%, rgba(38, 67, 138, 0.06) 0%, transparent 40%),
    radial-gradient(at 100% 30%, rgba(61, 107, 214, 0.04) 0%, transparent 35%),
    radial-gradient(at 50% 100%, rgba(38, 67, 138, 0.04) 0%, transparent 45%);
  mask-image: radial-gradient(ellipse 90% 60% at 50% 30%, black 40%, transparent 100%);
}
```

**N'est appliqué qu'à `/dashboard` (route home)**, pas sur les autres pages — préserve
la sobriété par défaut.

### 3.2 Double-layer border (cartes hero, KpiCard principales)

```css
.card-double-layer {
  border: 1px solid var(--border-default);
  box-shadow: inset 0 0 0 1px rgba(38, 67, 138, 0.08);
  /* Optionnel : marque de coin diagonale (innovation #10) */
  position: relative;
  overflow: hidden;
}
.card-double-layer::after {
  content: "";
  position: absolute;
  top: -1px;
  right: -1px;
  width: 14px;
  height: 14px;
  background:
    linear-gradient(135deg, transparent 50%, var(--brand-blue) 50%, var(--brand-blue) 52%, transparent 52%);
  pointer-events: none;
}
```

Réservée aux KPIs principaux du dashboard et au PageHero. **Pas sur les
cartes de liste secondaires** (rendrait l'écran bruyant).

### 3.3 Focus ring (remplace les glows)

Tout élément focusable :

```css
[data-theme="light"] *:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(38, 67, 138, 0.18);
  border-color: var(--border-focus);
}
```

### 3.4 Status dot pulse (remplace le néon vert)

```css
.status-dot-blue {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--brand-blue);
}
.status-dot-blue::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 4px rgba(38, 67, 138, 0.15);
  animation: pulse-halo 1.8s var(--ease-default) infinite;
}
@keyframes pulse-halo {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0; transform: scale(1.4); }
}
```

### 3.5 Hover lift (subtil, **jamais 2px+**)

```css
.lift-hover-light {
  transition:
    transform var(--dur-default) var(--ease-default),
    box-shadow var(--dur-default) var(--ease-default),
    border-color var(--dur-default) var(--ease-default);
}
.lift-hover-light:hover {
  transform: translateY(-1px); /* PAS -2px en light, ça fait amateur */
  box-shadow: var(--shadow-card-hover);
  border-color: var(--border-strong);
}
```

### 3.6 CTA primaire (bg bleu plein)

```css
.btn-primary-light {
  background: var(--brand-blue);
  color: var(--text-on-brand);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid var(--brand-blue);
}
.btn-primary-light:hover {
  background: var(--brand-blue-hover);
  border-color: var(--brand-blue-hover);
}
.btn-primary-light:active {
  background: var(--brand-blue-pressed);
  transform: translateY(1px);
}
.btn-primary-light:focus-visible {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 3px rgba(38, 67, 138, 0.18);
}
```

### 3.7 CTA secondaire / tertiaire

```css
.btn-secondary-light {
  background: #FFFFFF;
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}
.btn-secondary-light:hover {
  background: var(--bg-surface-strong);
  border-color: var(--border-strong);
}

.btn-ghost-light {
  background: transparent;
  color: var(--brand-blue);
}
.btn-ghost-light:hover {
  background: var(--brand-blue-tint);
}
```

---

## 4. Innovations visuelles light (récap des 10)

| # | Élément | Implémentation |
|---|---------|----------------|
| 1 | Mesh signature dashboard | `.ambient-bg-light` (recipe 3.1) — limité à `/dashboard` |
| 2 | Double-layer border | `.card-double-layer` (recipe 3.2) sur cartes hero + KPI principaux |
| 3 | Sidebar item actif | barre 3px `var(--brand-blue)` à gauche + bg `var(--bg-active)` |
| 4 | Données chiffrées mono | classe `.font-mono` + tracking `-0.01em` partout (KPIs, prix, IDs, kbd) |
| 5 | Sparkline | ligne 2px `var(--brand-blue)`, aire gradient 24%→0%, grille `#F1F4FA` |
| 6 | Status dot pulse | `.status-dot-blue` (recipe 3.4) — remplace tous les `bg-[var(--neon-success)]` du dark |
| 7 | Sélection / hover liste | bg `var(--bg-active)` + border 1px `var(--brand-blue)` |
| 8 | Lucide stroke 1.75px | déjà appliqué dans le code dark, **garder** en light |
| 9 | Bleu unique | aucune autre couleur d'accent — `--neon-violet` n'est PAS défini en light |
| 10 | KPI marque de coin | pseudo-element `::after` 14×14 avec triangle bleu top-right (recipe 3.2) |

---

## 5. Adaptation des composants atomiques

> **Aucun composant n'est dupliqué.** Tous référencent les CSS variables.
> En passant `data-theme="light"`, les valeurs résolues changent → les
> composants se ré-stylent automatiquement.

### 5.1 Mapping token-driven dark → light

Les **mêmes noms de variables** sont conservés pour ne pas casser le code
existant. Voici comment je remappe :

| Variable utilisée par les composants | Valeur dark | Valeur light |
|--------------------------------------|-------------|--------------|
| `--bg-primary` | `#070B14` | `#FFFFFF` |
| `--bg-glass` | `rgba(255,255,255,0.04)` | `#FFFFFF` |
| `--bg-glass-strong` | `rgba(255,255,255,0.06)` | `#F6F8FC` |
| `--bg-glass-hover` | `rgba(255,255,255,0.07)` | `#F1F4FA` |
| `--border-glass` | `rgba(255,255,255,0.08)` | `#ECEFF5` |
| `--border-glass-hover` | `rgba(255,255,255,0.12)` | `#D8E1F3` |
| `--text-primary` | `#F4F7FB` | `#0B1530` |
| `--text-secondary` | `rgba(244,247,251,0.64)` | `#4A5573` |
| `--text-tertiary` | `rgba(244,247,251,0.40)` | `#8892AB` |
| `--neon-cyan` | `#00E5FF` | `#26438A` |
| `--neon-cyan-soft` | `rgba(0,229,255,0.15)` | `#EEF2FA` |
| `--neon-cyan-glow` | `rgba(0,229,255,0.4)` | `rgba(38,67,138,0.18)` |
| `--neon-violet` | `#B16CFF` | `#26438A` (**aliasé sur le bleu**, pour ne rien casser) |
| `--neon-success` | `#00FFA3` | `#1A7F5A` |
| `--neon-success-soft` | `rgba(0,255,163,0.15)` | `#E6F4EE` |
| `--neon-danger` | `#FF3D71` | `#B91C3B` |
| `--neon-danger-soft` | `rgba(255,61,113,0.15)` | `#FCE8EC` |

### 5.2 Utilities theme-aware

Certaines utilities CSS doivent se comporter différemment :

| Utility | Dark | Light |
|---------|------|-------|
| `.glass` | bg `--bg-glass` + `backdrop-filter: blur(24px)` | bg `--bg-glass` + border `--border-glass` (pas de blur — pas de sens sur fond opaque) |
| `.glow-cyan` | `box-shadow: 0 0 24px ...neon-cyan-glow, inset ...` | `box-shadow: 0 0 0 3px rgba(38,67,138,0.18)` (focus ring style, pas glow) |
| `.glow-violet` | violet glow | identique à `.glow-cyan` (puisque violet = bleu en light) |
| `.glow-success` | success glow | `box-shadow: 0 0 0 3px rgba(26,127,90,0.16)` |
| `.glow-danger` | danger glow | `box-shadow: 0 0 0 3px rgba(185,28,59,0.16)` |
| `.lift-hover` | translateY -2px + glow cyan | translateY -1px + `--shadow-card-hover` |
| `.skeleton-shimmer` | gradient sur `--bg-glass` (sombre) | gradient sur `#F6F8FC` (clair) |
| `.pulse-dot` | halo cyan néon | halo `rgba(38,67,138,0.15)` (recipe 3.4) |
| `.ambient-bg` | 3 blobs néon fixed (cyan + violet + vert) | mesh subtil bleu (recipe 3.1) — **uniquement appliqué sur `/dashboard`** via classe ajoutée par la page |

### 5.3 Composants spécifiquement adaptés

| Composant | Modification light |
|-----------|--------------------|
| `Button` (variant `default`) | bg `--neon-cyan-soft` → en light = `#EEF2FA` + texte `--neon-cyan` = `#26438A` + ring `--neon-cyan` 40% (= bleu signature). Cohérent avec la doctrine "ghost-tinted" pour CTA secondaire. |
| `Button` (variant `primary`) | reste plein bleu en light (`bg---neon-cyan` → `#26438A` plein) avec texte `--bg-primary` = `#FFFFFF` ✅ |
| `Card` | en light, `glass` devient blanc plein avec border + shadow-card |
| `Input` | en light, focus ring `0 0 0 3px rgba(38,67,138,0.18)` au lieu du ring néon (recipe 3.3) |
| `PageHero` | en light, perd les glows néon, gagne la double-layer border (recipe 3.2). Mesh `.ambient-bg` uniquement sur dashboard home. |
| `Sidebar` | item actif : barre 3px bleu + bg `--bg-active` = `#EEF2FA` (innovation #3). Pill animé Framer Motion conservé, juste sans glow. |
| `Topbar` | search bouton : hover passe en bleu (`border-color: --brand-blue`), pas de glow. Cloche notif : dot bleu (pas rouge néon — la couleur d'urgence reste `--danger-fg` pour les vraies erreurs uniquement). |
| `KpiCard` | sparkline en bleu, marque de coin diagonale (innovation #10) sur les KPIs avec `tone="cyan"` |
| `StatusBadge` | success/danger/info utilisent les tokens sémantiques light (sobres, pas criards) |
| `Toast` (Sonner) | bg `#FFFFFF`, border `--border-default`, icône colorée selon variant |

---

## 6. Theme switcher — implémentation

### 6.1 Infrastructure

```tsx
// src/app/layout.tsx
<ThemeProvider
  attribute="data-theme"           // ← change "class" → "data-theme"
  defaultTheme="dark"
  themes={["dark", "light"]}        // ← explicite
  enableSystem={false}
  disableTransitionOnChange
>
```

`<html data-theme="dark">` ou `<html data-theme="light">` côté DOM.

### 6.2 globals.css restructuré

```css
/* Tokens dark — par défaut */
:root,
[data-theme="dark"] {
  --bg-primary: #070B14;
  --bg-glass: rgba(255, 255, 255, 0.04);
  /* ... tous les tokens dark actuels */
}

/* Tokens light — override */
[data-theme="light"] {
  --bg-primary: #FFFFFF;
  --bg-glass: #FFFFFF;
  --bg-glass-strong: #F6F8FC;
  --bg-glass-hover: #F1F4FA;
  --border-glass: #ECEFF5;
  --border-glass-hover: #D8E1F3;
  --text-primary: #0B1530;
  --text-secondary: #4A5573;
  --text-tertiary: #8892AB;
  --neon-cyan: #26438A;
  --neon-cyan-soft: #EEF2FA;
  --neon-cyan-glow: rgba(38, 67, 138, 0.18);
  --neon-violet: #26438A;            /* aliasé bleu */
  --neon-violet-soft: #EEF2FA;
  --neon-success: #1A7F5A;
  --neon-success-soft: #E6F4EE;
  --neon-danger: #B91C3B;
  --neon-danger-soft: #FCE8EC;
}

/* Body : background + gradient subtil bleu en light */
[data-theme="light"] body {
  background-color: var(--bg-canvas, #FAFBFD);
  background-image: none; /* pas de body gradient en light, on garde calme */
}

/* Utilities theme-aware */
[data-theme="light"] .glass {
  background: var(--bg-glass);
  backdrop-filter: none;             /* inutile sur fond opaque */
  border: 1px solid var(--border-glass);
}

[data-theme="light"] .glow-cyan {
  box-shadow: 0 0 0 3px rgba(38, 67, 138, 0.18);
}

[data-theme="light"] .lift-hover:hover {
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px rgba(11, 21, 48, 0.06),
    0 2px 4px rgba(11, 21, 48, 0.04);
  border-color: #D8E1F3;
}

[data-theme="light"] .ambient-bg::before,
[data-theme="light"] .ambient-bg::after,
[data-theme="light"] .ambient-bg > .blob {
  display: none;                     /* on désactive les blobs néon */
}
[data-theme="light"] .ambient-bg {
  background: /* mesh signature recipe 3.1 */;
}

[data-theme="light"] .pulse-dot {
  /* version bleue, recipe 3.4 */
}
```

### 6.3 ThemeToggle existant

Déjà branché sur `next-themes`. Il appelle `setTheme("light"|"dark")` →
l'attribut `data-theme` se met à jour automatiquement → le DOM se restyle
sans reload.

### 6.4 SSR / hydration

`next-themes` injecte un script anti-flash dans le `<head>` qui lit le
cookie/localStorage AVANT le premier paint, applique `data-theme="light"`
si nécessaire, puis hydrate. `suppressHydrationWarning` sur `<html>` est
déjà en place.

### 6.5 Pages spéciales

| Page | Comportement |
|------|--------------|
| `/dashboard/*`, `/admin/*` | suit le thème utilisateur |
| `/carte/[id]` | **indépendant** — utilise le thème du restaurant (light/dark configuré côté resto), aucun toggle utilisateur |
| `/login`, `/signup` | suit le toggle si défini ; défaut **light** (pré-login plus accueillant marketing) |
| `/` (vitrine) | défaut **light** également (look marketing classique) |

---

## 7. Anti-patterns light spécifiques (en plus des anti-patterns dark déjà documentés)

- ❌ **Gris froid** type `#F5F5F5` ou `neutral-100`. On utilise **uniquement** des gris légèrement bleutés (`#FAFBFD`, `#F6F8FC`, `#F1F4FA`).
- ❌ **Noir pur `#000`** pour le texte. Le primaire est `#0B1530`.
- ❌ **Ombres marketing** floues `box-shadow: 0 20px 60px rgba(0,0,0,0.2)`. Les ombres sont fines, multi-couches, courtes (recipes 2.6).
- ❌ **Bleu Facebook / bleu trop saturé** hors palette. `#26438A` et ses tints/shades calculés uniquement.
- ❌ **Card avec gradient bleu décoratif** type "header bleu + contenu blanc". Le bleu est ponctuel.
- ❌ **Texte gris sur gris** : `#8892AB` est le minimum, et uniquement pour du tertiaire non-critique.
- ❌ **Lucide stroke 1.5px** — disparait sur fond blanc. **Imposer 1.75px**.
- ❌ **Glow ou box-shadow néon** transposés tels quels — le focus ring `0 0 0 3px rgba(38,67,138,0.18)` les remplace **toujours**.
- ❌ **TranslateY -2px** sur les hover cartes (= amateur). Maximum **-1px** en light.
- ❌ **Tailwind `shadow-lg/xl/2xl` par défaut** — toutes les ombres passent par les tokens `--shadow-*`.

---

## 8. Roadmap d'exécution light

| Étape | Livrable | Validation |
|-------|----------|------------|
| 1 | `docs/design-system-light.md` (ce doc) | ⏳ utilisateur |
| 2 | `globals.css` restructuré : `[data-theme="light"]` + utilities theme-aware | auto |
| 3 | `ThemeProvider` config `attribute="data-theme"` + `themes={["dark","light"]}` | auto |
| 4 | Vérification visuelle des composants atomiques (Button, Card, Input, Badge, PageHero, KpiCard, StatusBadge) | utilisateur |
| 5 | Vérification du shell (Sidebar, Topbar, RestaurantSwitcher, SidebarFooter) | utilisateur |
| 6 | Innovation #1 : mesh signature sur `/dashboard` uniquement | utilisateur |
| 7 | Innovation #2 + #10 : double-layer border + marque de coin sur PageHero & KPI principaux | utilisateur |
| 8 | Innovation #6 : status-dot pulse bleu (remplace les status dots verts néon où ils existent) | utilisateur |
| 9 | Pass écran 1 (Tableau de bord) | utilisateur |
| 10 | Pass écran 2 (Éditeur de carte) | utilisateur |
| 11 | Pass écran 3 (QR codes) | utilisateur |
| 12 | Pass écran 4 (Stats) | utilisateur |
| 13 | Pass écrans 5-10 (resto / roulette / popups / sms / team / billing) | utilisateur |
| 14 | Vérif WCAG AA (contraste systématique) + `prefers-reduced-motion` | auto + utilisateur |

À chaque étape : screenshot ou description précise + attente du feu vert.

---

## 9. Décisions ouvertes (à valider)

1. **Default theme** : `dark` actuellement. On garde dark par défaut, ou on bascule en `light` par défaut côté utilisateur (puisque c'est la nouvelle direction artistique demandée) ?
   → **Recommandation** : garder dark par défaut (les utilisateurs existants ne sont pas surpris) ; light s'active via le toggle qui devient mieux visible (peut-être ajouter un onboarding tip "Nouveau : essayez le light mode").

2. **Pages publiques (`/`, `/login`)** : light par défaut, ou suivre le toggle utilisateur ?
   → **Recommandation** : `/` et `/login` en light forcé (logique marketing — un visiteur non connecté n'a pas de préférence stockée). Le toggle s'applique uniquement sur `/dashboard` et `/admin` après login.

3. **Carte publique `/carte/[id]`** : indépendante du toggle utilisateur — confirmation ?
   → **Recommandation** : oui, totalement indépendante. Le restaurateur choisit `theme: "light" | "dark"` dans son resto config, et c'est ce thème qui sert la carte au client final.

4. **Couleur `--neon-violet` en light** : aliasée sur le bleu (bleu unique de la palette), donc tout ce qui était violet en dark devient bleu en light — confirmation ?
   → **Recommandation** : oui, single-accent discipline = signature.

5. **Toggle UI** : 2 états (Light/Dark) ou 3 (Auto/Light/Dark) ?
   → **Recommandation** : 2 états seulement (le brief n'utilise pas system, et `enableSystem={false}` déjà en place).

6. **Marque de coin diagonale (innovation #10)** : sur **tous** les KpiCard ou seulement les **principaux** (les 4 du bento dashboard) ?
   → **Recommandation** : seulement les principaux — sinon ça devient un motif et perd sa valeur de "détail tech qui signe".

---

**Lis ce doc, valide / corrige / précise les 6 décisions ouvertes, et je
passe à l'étape 2 (globals.css + ThemeProvider config).**

**Aucune ligne de composant ne sera modifiée tant que tu n'as pas validé.**
