# Ruliz — Design System

> **Version** : 1.0 (refonte complète)
> **Statut** : ⏳ en attente de validation
> **Direction** : Glassmorphism + néon futuriste, version restaurateur premium.
> **Référence** : Linear, Vercel, Raycast, Stripe Dashboard.

Ce document est la **source unique de vérité** pour la refonte UX/UI. Tout le code
qui suit (composants atomiques → layout → écrans) doit en respecter strictement
les tokens, recipes et règles. Les anti-patterns en bas du document sont des
**rejets automatiques** — pas de PR avec un emoji dans l'UI, pas de gradient
arc-en-ciel, etc.

---

## 1. Direction artistique

Dark UI moderne où **la surface parle glass** et **l'accent parle néon**. Trois
blobs colorés flous (cyan + violet + vert) flottent en `position: fixed` derrière
toute l'application pour créer de la profondeur sans bruit visuel. Les surfaces
au-dessus sont translucides avec un `backdrop-filter` qui sature légèrement les
couleurs sous-jacentes — d'où le rendu "verre dépoli sur ciel nocturne".

La typographie est **tendue, professionnelle, jamais bavarde** (tracking
négatif sur les titres, mono pour tout ce qui est numérique). Pas un seul emoji
dans l'UI dashboard. Le copywriting est direct (`Carte en ligne` plutôt que
`Welcome back 👋`).

L'objectif émotionnel : un restaurateur qui ouvre son panel doit sentir qu'il
manipule un outil **premium, calme, rapide**, pas un dashboard B2B générique.

---

## 2. Tokens

### 2.1 Couleurs

| Token CSS | Valeur | Usage |
|-----------|--------|-------|
| `--bg-base` | `#070B14` | Background app |
| `--bg-glass` | `rgba(255,255,255,0.04)` | Toutes surfaces élevées |
| `--bg-glass-strong` | `rgba(255,255,255,0.06)` | Surfaces plus denses (modales) |
| `--bg-glass-hover` | `rgba(255,255,255,0.07)` | État hover |
| `--border-glass` | `rgba(255,255,255,0.08)` | Bordure subtile |
| `--border-glass-hover` | `rgba(255,255,255,0.12)` | Bordure hover |
| `--neon-cyan` | `#00E5FF` | CTA primaire, focus, item actif |
| `--neon-cyan-soft` | `rgba(0,229,255,0.15)` | Fond chip/tile cyan |
| `--neon-violet` | `#B16CFF` | Accent secondaire |
| `--neon-violet-soft` | `rgba(177,108,255,0.15)` | Fond chip/tile violet |
| `--neon-success` | `#00FFA3` | Succès, dot online |
| `--neon-success-soft` | `rgba(0,255,163,0.15)` | Fond chip succès |
| `--neon-danger` | `#FF3D71` | Destructif, erreurs |
| `--neon-danger-soft` | `rgba(255,61,113,0.15)` | Fond chip danger |
| `--text-primary` | `#F4F7FB` | Titres, labels clés |
| `--text-secondary` | `rgba(244,247,251,0.64)` | Body, secondaire |
| `--text-tertiary` | `rgba(244,247,251,0.40)` | Placeholders, section titles |

**Règle** : aucune autre couleur n'est autorisée. Si un état réclame un ton
différent, on passe par un mix entre 2 tokens existants (ex: dégradé
cyan→violet).

### 2.2 Typographie

| Famille | Usage | Détail |
|---------|-------|--------|
| **Geist Sans** (ou Inter en fallback) | Display, body | weight 400 / 500 / 600 / 700 |
| **Geist Mono** (ou JetBrains Mono) | Prix, codes, IDs, kbd | weight 400 / 500 |

**Tracking** : `-0.02em` sur tous les titres (h1 → h3). Body : tracking par défaut.

**Tailles** (Tailwind classes) :

| Classe | Taille | Usage |
|--------|--------|-------|
| `text-[10px]` | 10px | Eyebrows / micro-labels uppercase |
| `text-[11px]` | 11px | Section titles uppercase tracking-widest |
| `text-xs` | 12px | Chips, hints |
| `text-sm` | 14px | Body, items nav |
| `text-base` | 16px | Default |
| `text-lg` | 18px | Sous-titres |
| `text-xl` | 20px | Section headings |
| `text-2xl` | 24px | h2 hero, valeurs KPI |
| `text-3xl` | 30px | H1 page |
| `text-4xl` | 36px | Hero principal |

### 2.3 Spacing — base 4px

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

Tout doit s'aligner sur cette grille. Pas de `padding: 13px` ni de `gap: 7px`.
Tailwind classes `0.5 / 1 / 2 / 3 / 4 / 6 / 8 / 12 / 16` couvrent l'essentiel.

### 2.4 Rayons

| Valeur | Usage |
|--------|-------|
| `8px` (`rounded-md`) | Petits chips, tags |
| `12px` (`rounded-xl`) | Inputs, boutons |
| `16px` (`rounded-2xl`) | Cards, panels, drawers |
| `24px` (`rounded-3xl`) | Modales, gros overlays |
| `9999px` (`rounded-full`) | Avatars, status dots, pilules |

### 2.5 Motion

| Token | Valeur |
|-------|--------|
| `--ease-default` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--dur-fast` | `120ms` (focus, ripple) |
| `--dur-default` | `240ms` (hover, transitions de cartes) |
| `--dur-page` | `320ms` (transitions de page Framer Motion) |
| `--dur-max` | `400ms` (jamais au-delà) |

**Règles** :
- Cartes en hover : `translateY(-2px)` + glow apparaît, 240ms
- Listes : stagger 40ms par item, fade + slide-up 8px
- `prefers-reduced-motion: reduce` → motion désactivé, on garde uniquement
  les transitions d'opacité instantanées

---

## 3. Recipes

### 3.1 Glass surface

```css
background: var(--bg-glass);
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
border: 1px solid var(--border-glass);
```

Hover :

```css
background: var(--bg-glass-hover);
border-color: var(--border-glass-hover);
```

### 3.2 Glow néon (CTA primaire cyan)

```css
box-shadow:
  0 0 24px rgba(0, 229, 255, 0.40),
  inset 0 0 0 1px rgba(0, 229, 255, 0.60);
```

Variante violet :

```css
box-shadow:
  0 0 24px rgba(177, 108, 255, 0.40),
  inset 0 0 0 1px rgba(177, 108, 255, 0.60);
```

Variante danger :

```css
box-shadow:
  0 0 20px rgba(255, 61, 113, 0.35),
  inset 0 0 0 1px rgba(255, 61, 113, 0.55);
```

### 3.3 Background ambient (fixed, behind everything)

3 blobs en `position: fixed; pointer-events: none; z-index: -10;` :

| Blob | Position | Taille | Couleur (RGBA) | Blur | Opacity |
|------|----------|--------|----------------|------|---------|
| Cyan | top-left -10% | 40rem | `0,229,255` | 140px | 0.15 |
| Violet | bottom-right -10% | 36rem | `177,108,255` | 140px | 0.12 |
| Vert | center | 30rem | `0,255,163` | 160px | 0.06 |

Optionnel : grain SVG noise à 4% opacity pour casser le fond uniforme.

### 3.4 Focus ring

Tout élément focusable :

```css
outline: 2px solid var(--neon-cyan);
outline-offset: 2px;
```

Visible aussi sur fond glass (le contraste néon-cyan vs verre passe AA).

---

## 4. Composants atomiques

> Spec uniquement, pas de code à ce stade. Implémentation après validation.

### 4.1 Button

**Anatomie** : `[icon? leading] [label] [icon? trailing | shortcut?]`

**Variantes** :

| Variant | Surface | Texte | Glow |
|---------|---------|-------|------|
| `primary` | `--neon-cyan-soft` + ring 1px néon | blanc | cyan glow |
| `secondary` | glass | `--text-primary` | aucun |
| `ghost` | transparent + hover glass | `--text-secondary` → primary au hover | aucun |
| `danger` | `--neon-danger-soft` + ring | `--neon-danger` | rouge glow |
| `link` | aucun | `--neon-cyan` underline au hover | aucun |

**Tailles** : `sm` (h-8 px-3 text-xs) · `md` (h-9 px-4 text-sm, default) · `lg` (h-11 px-6 text-base)

**États** : idle / hover / active (translate-y-px) / focus (ring néon) / disabled (opacity-50, cursor-not-allowed) / loading (icône remplacée par spinner néon).

### 4.2 Card

**Anatomie** : `[header? > title + actions] [body] [footer?]`

**Variantes** :

- `glass` (default) — recipe glass + radius 16
- `glass-elevated` — glass + `transition: transform 240ms`, hover `translateY(-2px)` + glow cyan subtil
- `solid` — `--bg-base` + border glass, pas de blur (pour contenus très denses : grandes tables)

### 4.3 Input

**Anatomie** : `[icon? leading] [field] [icon? trailing | clear-button?]`

Glass bg, border glass, `text-sm`, `font-mono` pour valeurs numériques (prix).

| État | Style |
|------|-------|
| Idle | border glass |
| Hover | border-glass-hover |
| Focus | border `--neon-cyan` + ring `--neon-cyan` à 30% |
| Erreur | border `--neon-danger`, helper text `--neon-danger` |
| Disabled | opacity-50 |

Helper text en 11px secondary sous l'input.

### 4.4 Select / Combobox

Trigger identique à Input. Popover : `glass-elevated`, items h-9 avec icône
check si actif, hover bg-glass-hover. Recherche intégrée si > 8 items.

### 4.5 Modal / Dialog

| Couche | Style |
|--------|-------|
| Overlay | `bg-black/60 backdrop-blur-sm` |
| Surface | glass-strong + radius 24 + max-w-md \| 2xl \| 4xl |
| Animation | scale 0.96 → 1 + opacity 0 → 1, 240ms ease-default |

Padding : 24. Scroll interne si contenu > 80vh. Bouton close icône en haut-droite,
size sm, ghost.

### 4.6 Toast (Sonner)

| Aspect | Détail |
|--------|--------|
| Position | bottom-right desktop / top-center mobile |
| Surface | glass + radius 12 + border glass |
| Icône | néon par variant (success vert / error rouge / info cyan) |
| Auto-dismiss | 4s, hover pause |
| Stack | max 3 toasts visibles |

### 4.7 Badge / Chip

**Variantes** : `default` (glass) · `cyan` · `violet` · `success` · `danger`.

| Taille | h | px | text |
|--------|---|----|------|
| `xs` | 5 (20px) | 1.5 (6px) | `text-[10px]` mono uppercase |
| `sm` | 6 (24px) | 2 (8px) | `text-xs` |

Format coloré : `border [tone]/30 + bg [tone]/15 + text [tone]`.

### 4.8 Tooltip

Glass-strong, radius 8, max-w-xs, `text-xs`, padding 8/12. Délai d'apparition
300ms. Inclut `kbd` si raccourci dispo (`⌘K` etc).

### 4.9 Tabs

Underline animé style Linear : Framer Motion `layoutId` qui fait glisser
la barre néon cyan 2px sous le tab actif. Tab inactif : `--text-secondary`,
hover primary.

### 4.10 Switch

Track 36×20 glass, thumb 16px white. État ON : track avec gradient cyan +
glow néon, thumb glissé à droite. Animation 200ms.

### 4.11 Skeleton

Bg `--bg-glass` + animation shimmer (gradient horizontal qui passe, 1.6s ease
linéaire infini). **Jamais de spinner brut** dans les zones de contenu —
uniquement à l'intérieur des boutons en loading.

Format des skeletons : respectent la silhouette du contenu cible (3 lignes
texte, ou card avec image placeholder + 2 lignes).

### 4.12 Kbd

Mono, h-5, px-1.5, glass bg, border glass, `text-[10px]`. Pour `⌘K`, `Esc`, `Enter`, etc.

### 4.13 Avatar

Cercle, fallback en gradient `--neon-cyan-soft` → `--neon-violet-soft`,
initiales (1-2 lettres) en text-primary semibold. Status dot (`--neon-success`
ou `--neon-danger`) optionnel collé en bas-droite, ring 2px de couleur
`--bg-base` pour le détacher.

### 4.14 Dropdown menu

Glass-elevated, radius 12, padding 4. Items h-9 px-2.5 rounded-md, gap 8 entre
icône et label. Séparateurs : 1px `--border-glass`. Item destructif : texte
`--neon-danger` + hover bg `--neon-danger-soft`.

### 4.15 Command palette (`⌘K`)

Modal sans overlay sombre (overlay `bg-black/40 backdrop-blur-md`), positionné
top-center, max-w-xl. Glass-strong + radius 24. Champ search en haut (icône
loupe + `Esc` à droite). Items groupés par catégorie (Navigation / Actions /
Restaurants), chaque item h-10, icône leading néon, label + description, kbd
trailing si applicable. Navigation flèches haut/bas, `Enter` valide.

---

## 5. Patterns

### 5.1 Empty state

Layout centré, max-w-md :

1. **Illustration SVG néon** (line-art stroke 1.5px, couleur `--neon-cyan` ou `--neon-violet`)
2. **Titre** `text-lg font-semibold tracking-tight`
3. **Description** `text-sm text-secondary`
4. **CTA** primary

Pas de phrase molle. Pas d'emoji. Le titre doit nommer ce qui manque
(`Pas encore de QR code` plutôt que `Rien à afficher`).

### 5.2 Loading state

Skeleton shimmer aux **silhouettes du contenu cible**. Pour une liste, 3-5
items skeleton avec stagger 40ms. Pour un chart, area placeholder avec lignes
horizontales fines. Pour un dashboard, bento de skeletons.

### 5.3 Error state

- **Inline** (champ form) : helper text `--neon-danger` + border input danger.
- **Toast** (action API) : variant error, message actionnable, bouton "Réessayer".
- **Page** (404 / crash) : illustration néon rouge, titre, description, bouton "Retour au tableau de bord".

### 5.4 Confirmation destructive

Modal, titre clair (`Supprimer cette catégorie ?`), description listant les
**conséquences précises** (`12 plats seront supprimés. Action irréversible.`),
2 boutons : `Annuler` (secondary) à gauche, `Supprimer` (danger) à droite.
`Esc` annule. Focus initial sur `Annuler` (sécurité).

### 5.5 KPI card (Bento dashboard)

```
┌─────────────────────────┐
│ EYEBROW (10px tertiary) │
│                         │
│ 12 480  ↑ +12% (succès) │
│                         │
│ ╲╱╲╱╲╱╲╱╲╱╲╱  (sparkline) │
└─────────────────────────┘
```

- Eyebrow : `text-[10px] uppercase tracking-widest text-tertiary`
- Valeur : `text-2xl font-semibold tabular-nums`
- Delta : icône arrow + couleur néon (success si > 0, danger si < 0)
- Sparkline : Recharts area, gradient sous la courbe (cyan 30% → 0%)

### 5.6 Hero status (page header)

Glass-elevated card avec :

- Eyebrow chip (icône + libellé section)
- Titre H1 38px tracking-tight
- Description 16px secondary
- Slot actions à droite (boutons primary/secondary)
- Slot KPI chips à droite, sous les actions
- Optionnel : status dot pulsant (`Carte en ligne` avec dot vert qui pulse)

---

## 6. Layout (specs, implémentation step 3)

### 6.1 Sidebar

- **Déployée** : 240px (vs 260 actuel — on resserre)
- **Rétractée** : 72px (icônes seulement, tooltip au hover)
- 3 sections : `Principal` / `Acquisition` / `Gestion` (titres uppercase
  tracking-widest 11px tertiary)
- Item actif : surface glass-elevated + barre verticale gauche `--neon-cyan`
  2px avec glow + icône colorée néon
- Hover non-actif : glass surface apparaît (240ms)
- Filter live au-dessus de la nav (glass input)
- Footer : carte user avec avatar gradient + nom + plan, dropdown profil/logout
- Brand en haut : logo + nom Ruliz + status dot vert pulsant (serveur live)

### 6.2 Topbar

- Hauteur 56px
- Switcher restaurant à gauche (glass dropdown trigger)
- Breadcrumb dynamique au milieu
- Search `⌘K` à droite (glass button avec kbd intégré)
- Cloche notifs avec dot néon si non-lu
- Avatar trigger menu

### 6.3 Mobile

- Sidebar → bottom nav 5 items max : Tableau de bord, Carte, QR, Stats, Plus
  (drawer pour le reste)
- Topbar simplifiée : logo + ⌘K compact + avatar
- Tous les forms en `space-y-4` simple, pas de split layouts

### 6.4 Container responsive

- Padding horizontal : 16px mobile / 24px tablet / 32px desktop
- Max-width contenu : 1280px (centered)
- Bento grid : `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`,
  gap 16

---

## 7. Accessibilité (WCAG AA mandatory)

- **Contraste** : `--text-primary` sur `--bg-glass-strong` passe AA. Vérifié
  en CI via `axe-core`. Tout texte secondary doit être ≥14px sur glass simple
  (sinon il faut le passer en primary ou en strong glass).
- **Focus** : ring 2px `--neon-cyan` avec offset 2px sur tout élément focusable.
  Visible y compris sur fond glass (testé manuellement).
- **Touch targets** : 44×44px min sur mobile. Boutons icon-only `h-11 w-11`.
- **ARIA** : `aria-label` sur tout bouton icon-only, `aria-current="page"` sur
  item de nav actif, `role="status"` sur toasts d'info, `role="alert"` sur
  toasts d'erreur.
- **Navigation clavier** : `Tab` ordre logique, `Esc` ferme dropdowns/modals,
  `⌘K` ouvre la palette de commandes depuis n'importe où, `⌘Z` / `⌘⇧Z` undo/redo
  dans l'éditeur de carte.
- **`prefers-reduced-motion`** : tous les `motion.*` Framer wrappés dans un
  hook qui désactive l'animation (juste opacity).

---

## 8. Anti-patterns (rejet automatique)

- ❌ Couleurs hors palette (rose-fuchsia, jaune, orange…)
- ❌ Gradients arc-en-ciel ou dégradé violet/rose Bootstrap-AI générique
- ❌ Emoji dans l'UI dashboard (la carte publique côté client peut en avoir si pertinent)
- ❌ Bordures > 1px, ombres opaques noires (uniquement glow néon)
- ❌ Copy mou (`Welcome back 👋`, `Oops something went wrong`, `Loading…`)
- ❌ Spinner brut dans une zone de contenu (toujours skeleton)
- ❌ Marges hors grille 4px (`p-3.5`, `gap-7px`)
- ❌ Composants Material/Bootstrap reconnaissables (FAB, ripple Material, etc.)
- ❌ `any` en TypeScript
- ❌ `console.log` oubliés
- ❌ Passage d'un `LucideIcon` (forwardRef) depuis un Server Component vers un Client Component (cause un crash runtime — utiliser un `iconKey: string` + mapping côté client, déjà documenté dans CLAUDE.md)

---

## 9. Roadmap d'exécution

| Étape | Livrable | Validation |
|-------|----------|------------|
| 1 | `docs/design-system.md` (ce doc) | ⏳ utilisateur |
| 2 | Tokens dans Tailwind config + `globals.css` | auto |
| 3 | Composants atomiques : Button, Card, Input, Select, Modal, Toast, Badge, Tooltip, Tabs, Switch, Skeleton, Kbd, Avatar, Dropdown | utilisateur |
| 4 | Layout : Sidebar (groupes 240/72), Topbar, CommandPalette ⌘K, Container | utilisateur |
| 5 | Écran 1 — Tableau de bord | utilisateur |
| 6 | Écran 2 — Éditeur de carte | utilisateur |
| 7 | Écran 3 — QR codes | utilisateur |
| 8 | Écran 4 — Statistiques | utilisateur |
| 9 | Écran 5 — Mon resto | utilisateur |
| 10 | Écran 6 — Roulette d'avis | utilisateur |
| 11 | Écran 7 — Pop-ups | utilisateur |
| 12 | Écran 8 — SMS marketing | utilisateur |
| 13 | Écran 9 — Équipe | utilisateur |
| 14 | Écran 10 — Facturation | utilisateur |

À chaque étape : screenshot + résumé des décisions + attente du feu vert avant
de passer à la suivante.

---

## 10. Décisions ouvertes (à valider)

1. **Police** : Geist Sans + Geist Mono (recommandée — déjà utilisée par Vercel,
   chartée néon-friendly), ou Inter ? → recommandation : **Geist**.
2. **Sidebar collapsée 72px** : par toggle utilisateur ou auto sur breakpoint
   `md` ? → recommandation : **toggle persistant en cookie**, défaut déployé.
3. **Couleur d'accent secondaire** sur les pages : appliquer le `accent`
   (cyan/violet/resto/qrcodes) qu'on avait sur le PageHero, ou tout en cyan
   uniforme ? → recommandation : **uniforme cyan** pour la cohérence, le
   violet réservé aux features secondaires (Roulette/Jeu) qui le valorisent.
4. **Notifications** (cloche topbar) : on les ajoute au scope MVP de la refonte
   ou plus tard ? → recommandation : **placeholder visuel maintenant** (avec
   dot néon hardcodé), wiring backend en phase 2.
5. **Drag & drop catégories existant** (dnd-kit) : on conserve la logique, on
   réskinne uniquement le rendu visuel des items — confirmé.
6. **Données mockées** `/data/*.json` : à activer uniquement si tu veux un
   mode "demo" déconnecté ? Le projet est branché à Postgres Railway en
   production, donc par défaut on garde Prisma. → confirmation requise.

---

**Lis ce doc, valide / corrige, et je démarre les tokens + composants
atomiques (étape 2).**
