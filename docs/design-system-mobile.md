# Ruliz Design System — Couche MOBILE

> Ce doc **étend** `design-system.md` (dark glassmorphism + néon) et
> `design-system-light.md` (bleu signature `#26438A`). Il n'introduit AUCUNE
> nouvelle palette : il ajoute la couche **mobile-first** par-dessus l'existant.
>
> **Mantra** : 90% des restaurateurs utilisent Ruliz depuis leur téléphone, en
> service, debout, à une main, sous stress. Le mobile n'est pas une
> dégradation du desktop — c'est le produit.

---

## 1. Breakpoints (mobile-first stricte)

```ts
// tailwind.config.ts — surcharge des breakpoints par défaut
screens: {
  // Mobile = défaut, sans préfixe
  xs:   "360px",   // Petit Android (S23, A03)
  sm:   "640px",   // Phablette portrait, tablette landscape petite
  md:   "768px",   // iPad mini, Fold ouvert
  lg:   "1024px",  // ⚠️ FRONTIÈRE : passe de mobile shell → desktop shell
  xl:   "1280px",  // Laptop standard
  "2xl": "1536px", // Grand écran
}
```

**Règle absolue** : tout style commence en mobile (sans préfixe), puis
**élargit** vers le haut. `lg:` = bascule shell. Jamais de `max-lg:` pour
"désactiver desktop" — penser à l'envers.

### Plage supportée

- **Bas** : 280px (Galaxy Fold replié) — aucun overflow horizontal toléré
- **Haut** : 2560px+ (4K) — contenu cappé via `max-w` mais pas étiré
- Cibles testées (Chrome DevTools + responsively.app) :
  - 320×568 — iPhone SE 1
  - 360×780 — Galaxy S23/S24
  - 375×667 — iPhone SE 2/3 ⭐ **baseline**
  - 393×852 — iPhone 15 Pro (Dynamic Island)
  - 412×915 — Pixel 7/8
  - 430×932 — iPhone 15 Pro Max
  - 768×1024 — iPad mini
  - 1024×1366 — iPad Pro 13
  - 1440 / 1920 / 2560 — Desktop

---

## 2. Viewport meta

```ts
// src/app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // PAS de maximumScale: l'utilisateur doit pouvoir zoomer (a11y WCAG)
  viewportFit: "cover",  // Active env(safe-area-inset-*) pour notch/Dynamic Island
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#070b14" },
    { media: "(prefers-color-scheme: light)", color: "#26438a" },
  ],
};
```

---

## 3. Touch & ergonomie tactile

### Touch targets

| Élément | Min visible | Min hit-area | Notes |
|---|---|---|---|
| Action primaire (CTA principal) | 48×48 | 48×48 | Material baseline |
| Action secondaire (icon button) | 24×24 | 44×44 | Padding pour étendre |
| Item de liste tappable | full-width × 56 | full-width × 56 | iOS HIG list row |
| Bottom nav item | 64×56 | 64×56 | Iconlabel empilés |
| FAB | 56×56 | 56×56 | 16px de marge écran + safe-area |
| Bouton central QR (BottomNav) | 52×52 | 52×52 | Surélevé +8px |
| Drag handle (bottom sheet) | 32×4 visible | hit-area parent 100%×24 | Toute la zone du handle area saisissable |

**Espacement** : 8px minimum entre deux cibles tactiles côte à côte.

### Utilities Tailwind dédiées

```css
@layer utilities {
  .tap-44 { min-width: 44px; min-height: 44px; }
  .tap-48 { min-width: 48px; min-height: 48px; }
  .tap-56 { min-width: 56px; min-height: 56px; }
}
```

### Feedback tactile

- **Visuel** : `active:scale-[0.98]` ou `active:opacity-90`, transition
  `transition-transform duration-100`
- **Haptic** (quand supporté, no-op gracieux sinon) :
  ```ts
  // src/lib/haptic.ts
  export const haptic = {
    light: () => navigator.vibrate?.(10),
    medium: () => navigator.vibrate?.(15),
    selection: () => navigator.vibrate?.([5, 10, 5]),
    success: () => navigator.vibrate?.([10, 50, 10]),
    error: () => navigator.vibrate?.([50, 30, 50]),
  };
  ```
- Déclencher haptic sur : long press, swipe action, FAB, toast destructif undo,
  réussite optimistic update.

### Anti-frictions

```css
/* globals.css — @layer base */
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  -webkit-tap-highlight-color: transparent;  /* No flash bleu Android */
  touch-action: manipulation;                /* No double-tap zoom, no 300ms */
  overflow-x: hidden;                        /* Garde-fou anti-overflow */
}
input, textarea, select {
  font-size: 16px;                           /* Anti-zoom Safari iOS */
}
```

### Inputmode

Tous les `<input>` doivent porter le bon `inputmode` :

| Type donnée | `inputmode` | `type` |
|---|---|---|
| Email | email | email |
| Téléphone | tel | tel |
| Prix € | decimal | text (pas number — pb spinners mobiles) |
| Quantité entière | numeric | text |
| Code postal | numeric | text |
| Recherche | search | search |
| URL | url | url |

---

## 4. Safe areas iOS

```css
@layer utilities {
  /* Padding (utilisation : top bar + bottom nav + FAB + toasts + modales) */
  .safe-top    { padding-top:    env(safe-area-inset-top); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  .safe-left   { padding-left:   env(safe-area-inset-left); }
  .safe-right  { padding-right:  env(safe-area-inset-right); }

  /* Avec minimum garanti (le plus commun) */
  .safe-bottom-min-4 { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
  .safe-bottom-min-5 { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
  .safe-top-min-3    { padding-top:    max(12px, env(safe-area-inset-top)); }

  /* Margin (pour éléments flottants tels que FAB) */
  .safe-bottom-mb-4  { margin-bottom: max(16px, env(safe-area-inset-bottom)); }

  /* Hauteur dynamique (gère barre URL Safari mobile qui apparaît/disparaît) */
  .h-dvh-screen     { height:     100dvh; }
  .min-h-dvh-screen { min-height: 100dvh; }
  .max-h-dvh-90     { max-height: 90dvh;  }
}
```

**Règles d'usage** :
- Top bar : `safe-top` + `h-14` (56px sous le notch)
- Bottom nav : `safe-bottom` + `h-16` (64px au-dessus du home indicator)
- FAB : `safe-bottom-mb-4` + `mr-4`
- Toasts mobile : `bottom: calc(64px + env(safe-area-inset-bottom) + 16px)`
- Modales bottom sheet : padding bottom = `safe-bottom-min-5`
- Drawer "Plus" : `max-h-dvh-90` + `safe-bottom-min-5`

---

## 5. Typographie mobile

### Échelle responsive (clamp pour fluide)

```css
@layer utilities {
  /* Display — H1 hero, écrans pleins */
  .text-display-1 { font-size: clamp(28px, 7vw, 40px); line-height: 1.15; letter-spacing: -0.02em; }
  .text-display-2 { font-size: clamp(24px, 6vw, 32px); line-height: 1.2;  letter-spacing: -0.02em; }

  /* Heading */
  .text-h1 { font-size: clamp(22px, 5.5vw, 28px); line-height: 1.25; letter-spacing: -0.015em; }
  .text-h2 { font-size: clamp(20px, 5vw,   24px); line-height: 1.3;  letter-spacing: -0.01em; }
  .text-h3 { font-size: clamp(18px, 4.5vw, 20px); line-height: 1.35; }

  /* Body */
  .text-body    { font-size: 16px; line-height: 1.5; }       /* Mini iOS anti-zoom */
  .text-body-sm { font-size: 14px; line-height: 1.5; }       /* Secondaire */
  .text-caption { font-size: 12px; line-height: 1.4; letter-spacing: 0.01em; }
  .text-overline { font-size: 11px; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.08em; }
}
```

### Règles dures

- **Body** : 16px minimum (anti-zoom Safari + lisibilité)
- **Labels secondaires** : 12px minimum
- **JAMAIS < 11px**
- **Line-height body** : 1.5 (relaxed)
- **Headings** : `tracking-tight` (déjà appliqué globalement aux h1/h2/h3)
- **Tabular-nums** systématique sur prix, compteurs, KPIs (`tabular-nums`)
- **Texte tronqué** : `line-clamp-2` ou `line-clamp-3` (jamais `truncate` une seule ligne sur mobile sauf dans les listes courtes type lang switcher)

---

## 6. Spacing & layout

### Échelle (Tailwind défaut convient)

| Token | Valeur | Usage type mobile |
|---|---|---|
| `gap-1` / `p-1` | 4px | Inline icon+label |
| `gap-2` / `p-2` | 8px | Spacing min entre tap targets |
| `gap-3` / `p-3` | 12px | Items de liste compactes |
| `gap-4` / `p-4` | 16px | **Padding screen latéral standard** |
| `gap-5` / `p-5` | 20px | Sections sur écran large |
| `gap-6` / `p-6` | 24px | Espacement vertical entre sections |
| `gap-8` / `p-8` | 32px | Top spacing après hero |

### Container mobile

- Padding latéral standard : **16px** (`px-4`)
- Sur très petits écrans (< 360px) : **12px** (`px-3 xs:px-4`)
- Pas de `max-width` sur mobile (full-width edge-to-edge sauf le `px-4`)
- Sur tablette+ (`md:`) : `max-w-2xl mx-auto`
- Sur desktop (`lg:`) : largeur dictée par le shell desktop existant

---

## 7. Tokens — extension mobile

Tous les tokens existants (`--bg-glass`, `--neon-cyan`, etc.) restent valides.
Ajouts spécifiques mobile :

```css
/* dark mode */
:root {
  /* === Z-index échelle (évite le bordel) === */
  --z-content:        1;
  --z-sticky:         10;   /* top bar collapse, headers de section */
  --z-fab:            20;   /* FAB > content */
  --z-bottom-nav:     30;   /* bottom nav > FAB pour ne jamais le masquer */
  --z-toast:          40;   /* toasts au-dessus de tout content */
  --z-sheet-backdrop: 50;
  --z-sheet:          51;
  --z-modal-backdrop: 60;
  --z-modal:          61;
  --z-popover:        70;
  --z-tooltip:        80;

  /* === Hauteurs shell mobile === */
  --h-mobile-topbar:    56px;
  --h-mobile-bottomnav: 64px;
  --h-fab:              56px;

  /* === Ombres mobiles spécifiques (light mode override les remappe) === */
  --shadow-bottom-nav: 0 -1px 0 var(--border-glass), 0 -8px 24px rgba(0, 0, 0, 0.18);
  --shadow-fab:        0 8px 16px rgba(0, 229, 255, 0.32), 0 4px 8px rgba(0, 0, 0, 0.24);
  --shadow-sheet:      0 -16px 48px rgba(0, 0, 0, 0.32);
}

[data-theme="light"] {
  --shadow-bottom-nav: 0 -1px 0 var(--border-glass), 0 -8px 24px rgba(11, 21, 48, 0.06);
  --shadow-fab:        0 8px 16px rgba(38, 67, 138, 0.24), 0 4px 8px rgba(11, 21, 48, 0.08);
  --shadow-sheet:      0 -16px 48px rgba(11, 21, 48, 0.12);
}
```

---

## 8. Composants atomiques mobile-first

> **Spec only** dans ce doc — pas de code. Les composants seront construits
> dans la phase 2 après validation.

### `<Button>` (extension de l'existant)

- Tailles : `sm` (h-9, 36px), `default` (h-11, 44px), `lg` (h-12, 48px), `xl` (h-14, 56px — CTA bottom sheet)
- **Min h-11 par défaut** sur mobile, vs h-9 actuel desktop. La taille
  `default` change selon le contexte mobile/desktop via la `useIsMobile()`
  (cf. shell ci-dessous).
- `active:scale-[0.98]` baked in
- Variants intactes : `default`, `outline`, `ghost`, `destructive`, `link`

### `<Input>`, `<Textarea>`, `<Select>`

- Hauteur mobile : 48px (`h-12`), desktop 36px (`h-9`)
- `font-size: 16px` toujours
- `inputmode` requis
- Label au-dessus, jamais à côté (pas de form horizontal sur mobile)
- `<Select>` mobile : utiliser le natif `<select>` quand possible (plein écran iOS, mieux qu'un dropdown custom). Si dropdown custom nécessaire, déclencher un BottomSheet.

### `<Card>`

- Padding mobile `p-4`, desktop `p-6`
- Radius `rounded-xl` (12px)
- Pas d'ombre marquée par défaut sur mobile (économie de GPU)

### `<BottomSheet>` (Vaul)

- 3 snap points : Peek (30vh) / Half (60vh) / Full (95vh)
- Drag handle 32×4 centré top, gris (`bg-[var(--text-tertiary)]/40`)
- Backdrop semi-opaque (rgba 0,0,0, 0.5 dark / 0.35 light) tappable
- Swipe-down pour réduire (snap inférieur) ou fermer (depuis Peek)
- Padding interne : `px-5 py-6` + `safe-bottom-min-5`
- Sur desktop : Vaul s'adapte en modal centrée (built-in)

### `<Toast>` (Sonner customisé)

- Position mobile : `bottom: calc(80px + env(safe-area-inset-bottom))`
  (au-dessus de la bottom nav)
- Position desktop : `top-right`
- Largeur mobile : `calc(100vw - 32px)` (16px margin chaque côté)
- Auto-dismiss 4s, swipe-up pour dismiss
- Variantes : `info` / `success` / `error` / `loading`
- **Action undo** sur destructifs : 5s, dismiss = confirme l'action
- Haptic léger sur destructif et success

### `<FAB>`

- 56×56, `rounded-full`, `shadow-fab`, fond `--accent`, icon `--accent-foreground`
- Position : `fixed bottom-[calc(64px+env(safe-area-inset-bottom)+16px)] right-4`
- **Comportement scroll** : disparaît au scroll-down (translate-y + opacity 0),
  réapparaît au scroll-up. Géré via `useScrollDirection()` hook.
- Sur desktop : devient bouton inline dans la PageHero (pas de FAB flottant)

### `<BottomNav>` (5 items)

- Hauteur 64px + safe-bottom
- 5 items : Home / Carte / **QR** (centre) / Stats / Plus
- Item normal : icon 24px + label 11px (overline-style), tap-area 64×56
- **Item central QR** : 52×52, surélevé +8px, fond accent, ombre `shadow-fab`,
  icon 28px blanc. Tap → écran QR codes ; long press → bottom sheet "Actions
  rapides QR" (créer nouveau QR, scanner un QR, partager dernier QR).
- État actif : icône colorée `--accent` + label `--text-primary` + dot 4px
  sous l'icône
- État inactif : icône + label `--text-secondary`
- Backdrop blur léger en dark (`backdrop-blur-md`), solide en light
- `box-shadow: var(--shadow-bottom-nav)` (ombre vers le haut)
- z-index `var(--z-bottom-nav)`

### `<MobileTopBar>` (collapsible)

- Hauteur 56px + safe-top
- Layout : `[back/switcher] [titre tronqué centré] [action]`
- Bouton back : 44×44, icon ChevronLeft, texte écran précédent caché
  visuellement (visible au lecteur d'écran)
- Switcher resto (sur écrans racine) : `<Avatar 32px>` + nom resto tronqué + chevron
- Titre : `text-h3` font-semibold, `truncate`
- **Comportement scroll** : se cache (translate-y -100%) au scroll-down de
  > 8px, réapparaît au scroll-up. Ombre subtile apparaît au scroll > 8px
  pour séparer du contenu (border-bottom révélée).
- z-index `var(--z-sticky)`

### `<MobileDrawerPlus>` (bottom sheet)

- Vaul snap Full (90vh)
- Sections groupées avec titre overline :
  - **Acquisition** : Roulette d'avis, Pop-ups, SMS marketing
  - **Gestion** : Mon resto, Équipe, Facturation
  - **Compte** : Profil, Préférences, Aide & support, Déconnexion (rouge)
- Items 56px height, icon 24 + label 16, chevron droit
- Search bar collapsible en haut (input 48px) — optionnel V2

### `<SwipeableListItem>`

- Wrapper Framer Motion `useDrag` ou react-swipeable
- Swipe gauche révèle 1-2 actions (max 96px largeur cumulée)
  - Modifier (icon, accent neutre)
  - Supprimer (icon trash, fond `--neon-danger`, texte blanc)
- Swipe droite : action positive (Dupliquer / Activer)
- Indicateur d'affordance : oscillation 1× au 1er rendu (animation
  `keyframes` 800ms ease-out, désactivée si `prefers-reduced-motion`)
- Threshold : 60px pour révéler, 120px pour auto-trigger l'action principale
- Long press 500ms = menu contextuel (bottom sheet) — alternative au swipe

### `<Skeleton>`

- Variants `.text` (h-4), `.title` (h-6), `.card` (h-24), `.avatar` (size-10)
- Animation `pulse` lente (2s) — désactivée si `prefers-reduced-motion`
- Couleur `var(--bg-glass-strong)` avec shimmer optionnel

### `<PullToRefresh>`

- Wrapper sur les listes scrollables
- Threshold 80px de pull pour déclencher
- Spinner néon custom (cercle avec gradient `--accent` qui rotate)
- Haptic léger au déclenchement

### `<SegmentedControl>`

- Pour filtres période, modes vue, etc.
- Style iOS : container fond `--bg-glass-strong`, segment actif fond
  `--bg-primary` + ombre subtile
- Hauteur 36px (compact) ou 44px (standard)
- Scroll horizontal si > 4 segments (`scroll-snap-x`)

### `<ScrollSnapList>`

- Pour comparateur plans Facturation, hero stats horizontaux
- `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`,
  `overscroll-behavior: contain`
- Indicator dots dessous (`max-7` dots, sinon barre de progression)

---

## 9. Navigation mobile — schéma global

```
┌─────────────────────────────┐
│ safe-top                    │
├─────────────────────────────┤
│ MobileTopBar (56px)         │ ← collapsible au scroll
│ [back/switch] [titre] [act] │
├─────────────────────────────┤
│                             │
│                             │
│  Content scrollable         │
│  (pull-to-refresh)          │
│                             │
│                             │
│                       ┌───┐ │
│                       │FAB│ │ ← contextuel par écran
│                       └───┘ │
├─────────────────────────────┤
│ BottomNav (64px)            │
│ [🏠] [📋] [📱] [📊] [≡]      │ ← QR centre surélevé
├─────────────────────────────┤
│ safe-bottom                 │
└─────────────────────────────┘
```

### Bottom Nav — items

| # | Label | Icon | Route | Notes |
|---|---|---|---|---|
| 1 | Accueil | Home | `/dashboard` | Tableau de bord |
| 2 | Carte | UtensilsCrossed | `/dashboard/menu` | L'éditeur, action #1 |
| 3 | **QR** | QrCode | `/dashboard/qrcodes` | **Centre, surélevé, accent, 52×52** |
| 4 | Stats | BarChart3 | `/dashboard/stats` | |
| 5 | Plus | Menu | (drawer, no route) | Ouvre `<MobileDrawerPlus>` |

**Admin (`/admin/*`)** : même pattern, items différents :
1. Vue · 2. Clients · 3. **Activité** (centre) · 4. Logs · 5. Plus

### Drawer "Plus" — sections

```
═══ ACQUISITION ════════════════
🎰 Roulette d'avis
📢 Pop-ups
💬 SMS marketing

═══ GESTION ═══════════════════
🏠 Mon resto
👥 Équipe
💳 Facturation

═══ COMPTE ════════════════════
👤 Profil
⚙️ Préférences
❓ Aide & support
🚪 Déconnexion          (rouge)
```

### Top Bar — patterns par type d'écran

| Type écran | Gauche | Centre | Droite |
|---|---|---|---|
| Racine (Tableau de bord, Carte, Stats, QR) | Switcher resto | Titre écran | 🔍 Recherche |
| Détail (édition plat, fiche QR) | ← Back | Titre item tronqué | ⋯ Plus actions |
| Édition modale full-screen | ✕ Annuler | Titre | ✓ Enregistrer |
| Wizard multi-étapes | ← Back | "Étape 2 / 3" | ✕ Quitter |

---

## 10. Shell responsive — décision technique

### Choix : un seul DOM, swap CSS via `lg:` breakpoint

**Pourquoi** : éviter le flash hydratation (`useIsMobile()` qui SSR `false`
puis re-render `true` provoque un flicker visible). Coût payload négligeable
(< 5kb pour les deux navs).

**Implémentation** :

```tsx
// src/components/shell/app-shell.tsx (Server Component)
export function AppShell({ children, scope }: { children: ReactNode; scope: "admin" | "dashboard" }) {
  return (
    <div className="min-h-dvh-screen">
      {/* MOBILE shell : visible < lg, hidden ≥ lg */}
      <div className="lg:hidden">
        <MobileTopBar scope={scope} />
        <main className="pt-[calc(56px+env(safe-area-inset-top))] pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <MobileBottomNav scope={scope} />
      </div>

      {/* DESKTOP shell : hidden < lg, visible ≥ lg */}
      <div className="hidden lg:block">
        <DesktopShell scope={scope}>{children}</DesktopShell>
      </div>
    </div>
  );
}
```

⚠️ Risque : `{children}` rendu deux fois → side-effects doublés si serveur.
**Mitigation** : tous les Server Components fetch sont idempotents et cachés
par Next.js (deduping automatique). À monitorer en revue.

**Alternative écartée** : `useIsMobile()` côté client → flash hydratation.
Pourrait être réintroduit si on accepte un skeleton intermédiaire.

### Hook utilitaires

```ts
// src/hooks/use-is-mobile.ts
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// src/hooks/use-scroll-direction.ts → "up" | "down" | "idle"
// Pour FAB et MobileTopBar collapse au scroll
```

---

## 11. Performance — budget mobile

| Métrique | Cible | Outil |
|---|---|---|
| First Contentful Paint | < 1.5s @ Slow 4G | Lighthouse CI |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Interaction to Next Paint | < 200ms | Lighthouse / Real User |
| Bundle JS initial route racine | < 200kb gzipped | `next build --analyze` |
| Total page weight | < 1MB | Network tab |

**Tactiques** :
- `next/image` partout, AVIF/WebP, `loading="lazy"` sauf hero
- `dynamic(() => import(...))` pour : roulette canvas, drag-and-drop carte,
  charts (Recharts), color pickers, code editors
- Polices Geist preload poids 400 + 600 uniquement (subset latin)
- Service Worker + manifest PWA (installable iOS/Android, splash dark)
- Pas de Recharts si une sparkline SVG fait main suffit

---

## 12. Accessibilité

- WCAG AA strict, contrastes vérifiés sur les deux thèmes (text-secondary
  `#4A5573` sur `#FAFBFD` → ratio 7.1 ✅)
- Zoom utilisateur jusqu'à 200% non-bloqué
- ARIA labels sur toutes les icônes seules (lang switcher, burger, gift,
  social, FAB, BottomNav items, etc.)
- Ordre de focus logique (testé Tab + Shift+Tab sur tablette + clavier BT)
- Landmarks : `<header>`, `<nav>`, `<main>`, `<footer>`
- `prefers-reduced-motion` désactive transforms et stagger, garde fades
- `prefers-color-scheme` initial respecté, override manuel persistant
  (cookie + localStorage déjà en place via next-themes)
- `prefers-reduced-data` : reduce des images (qualité 50, pas d'autoplay)
  — V2 optionnel

---

## 13. Anti-patterns interdits

- ❌ Hamburger menu sur écran racine mobile (60% des features cachées)
- ❌ Modale centrée style desktop sur mobile → BottomSheet
- ❌ Tooltip au hover seul → long press OU icône info dédiée
- ❌ Tableau scroll horizontal → cards empilées ou liste reformatée
- ❌ Champs form côte à côte sur mobile → toujours empilés
- ❌ Texte < 14px (sauf labels secondaires, mini 12px)
- ❌ Boutons "OK / Annuler" sans icônes ni couleurs sémantiques
- ❌ Feedback visuel uniquement → toasts + haptic léger sur actions clés
- ❌ Sticky qui mange > 40% de hauteur écran
- ❌ "Voir version desktop" → impensable

---

## 14. Stack & libs additionnelles à installer

| Lib | Usage | Justification |
|---|---|---|
| `vaul` | BottomSheet avec drag | Standard de fait Next.js, compatible Radix |
| `react-swipeable` ou Framer Motion drag | Swipe actions | Framer déjà présent, on évite la nouvelle dep |
| `@tanstack/react-query` | Optimistic UI + cache | Si pas déjà présent |
| `next-pwa` ou manifest manuel | PWA | Manifest manuel suffit, pas de SW custom V1 |

---

## 15. Workflow phase 2 (composants)

Après validation de ce doc :

1. **Atomes** (1 PR) : Button, Input, Card, Sheet (Vaul), Toast (Sonner override),
   FAB, Skeleton, SegmentedControl, ScrollSnapList
2. **Navigation shell** (1 PR) : MobileTopBar, MobileBottomNav, MobileDrawerPlus,
   AppShell orchestrateur, hooks (useIsMobile, useScrollDirection)
3. **Patterns** (1 PR) : SwipeableListItem, PullToRefresh, LongPressMenu, haptic helper
4. **Migration écrans** (1 PR par écran) : Tableau de bord → Éditeur de carte →
   QR → Stats → Mon resto → Roulette → Pop-ups → SMS → Équipe → Facturation
   - Screenshots 375 + 393 + 768 + 1440 attachés à chaque PR
5. **Audit final** : Lighthouse mobile (objectif 95+), test devices réels (iPhone
   SE 2020 + un Android entry-level)

---

## 16. Tests obligatoires par composant / écran

À chaque livraison :
- [ ] Aucun overflow horizontal entre 280px et 1023px
- [ ] Touch targets ≥ 44px partout (audit via DevTools "show tap targets")
- [ ] Safe-areas respectées en portrait + landscape (notch + home indicator)
- [ ] Inputs `font-size: 16px` (pas de zoom auto au focus)
- [ ] Aucun élément coupé/tronqué non-élégant sur 320×568 (iPhone SE 1)
- [ ] FAB / CTA primaire atteignable au pouce (tiers inférieur écran)
- [ ] Navigation fluide 60fps sur Pixel 5 / iPhone SE 2020 (DevTools throttle 4× CPU)
- [ ] `prefers-reduced-motion` respecté (transforms désactivés, fades OK)
- [ ] `prefers-color-scheme` initial respecté (avant interaction user)
- [ ] Lighthouse mobile ≥ 90 sur Performance + Accessibility + Best Practices

---

## 17. Statut & questions ouvertes

- [ ] **Validation Tristan** sur les 5 items bottom nav (ordre + choix Stats vs autre ?)
- [ ] **Drawer "Plus"** : vraiment tout y mettre, ou en V2 monter Mon resto au top ?
- [ ] **PWA installable** : on inclut V1 ou V2 ?
- [ ] **Switcher resto** dans top bar : pertinent pour 90% des restaurateurs
      mono-resto, ou afficher le nom resto sans interaction si 1 seul ?
- [ ] **Recherche globale** mobile : on attend V1 ou on shipe V2 ?
- [ ] **Long press menu contextuel** : V1 ou V2 ?
- [ ] **Pull-to-refresh** : V1 sur Tableau de bord uniquement ?

---

**Prochaine action attendue** : validation de ce doc (ou ajustements demandés)
avant d'attaquer la phase 2 — composants atomiques.
