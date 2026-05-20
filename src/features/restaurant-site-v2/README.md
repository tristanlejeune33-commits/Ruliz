# Restaurant Site v2 — Template éditorial-magazine

Port pixel-perfect de la maquette validée (`NOUVEAU_TEMPLATE.md`).

## Usage

```tsx
import { RestaurantSite } from "@/features/restaurant-site-v2/RestaurantSite";
import type { RestaurantConfig } from "@/features/restaurant-site-v2/types";

const config: RestaurantConfig = {
  /* ... */
};

export default function Page() {
  return <RestaurantSite config={config} />;
}
```

## Props (`RestaurantConfig`)

Une seule prop. Tout est dedans. Cf. `types.ts` pour la shape complète.

### Champs critiques

| Champ | Type | Détails |
| --- | --- | --- |
| `restaurantName` | `string` | Nom affiché partout. |
| `tagline` | `string` | Phrase d'accroche hero + footer. |
| `logoUrl` | `string \| null` | Logo (PNG/SVG). Si `null`, monogramme initiales dans la navbar et nom display en hero. |
| `bannerUrl` | `string \| null` | Image hero. Fallback : `heroImage`. |
| `accentColor` | `string` | Hex `#RRGGBB` ou `oklch(...)`. Converti via `hexToOklch()` côté composant. |
| `typographyPreset` | `'editorial' \| 'modern' \| 'classic'` | Pilote les CSS variables `--font-display/body/mono`. |
| `city` | `string` | Affiché dans l'eyebrow hero + footer. |
| `established` | `number` | Année d'ouverture, format `"Depuis 2014"`. |

### Sections

| Champ | Type | Notes |
| --- | --- | --- |
| `about.title/body/image/signature` | objet | `body` = array de paragraphes. Drop-cap auto en preset editorial. |
| `menuTeaser.title/items` | objet | `items` slice à 4 max. |
| `gallery` | `string[]` | 6 à 12 URLs, slice à 8 max côté composant (pattern bento). |
| `testimonials` | `Testimonial[]?` | 3 idéalement. Section cachée si `[]` ou absent. |
| `practical.hours` | `HoursRow[]` | 7 entrées lun→dim. `hours: null` = fermé. Le jour courant est highlighté. |
| `practical.googleMapsUrl` | `string` | Embed iframe grayscale auto-généré depuis cette URL. |
| `socials` | objet | Tous champs nullables. Footer "—" si tous null. |
| `reservationUrl` | `string \| null` | Null = CTA Réserver caché partout (navbar / hero / float / section). |
| `menuUrl` | `string` | Route interne `/carte/[id]`. |

### Options visuelles

| Champ | Type | Effet |
| --- | --- | --- |
| `options.heroLayout` | `'banner' \| 'split'` | Banner = full-bleed, Split = 50/50. |
| `options.aboutImageLeft` | `boolean` | True (default) photo gauche, false = inversion via `direction: rtl`. |
| `options.theme` | `'light' \| 'dark'` | Tokens CSS oklch basculent. Light par défaut (food-friendly). |
| `options.showGallery/Testimonials/Reservation` | `boolean` | Sections masquables. |

## Architecture

```
src/features/restaurant-site-v2/
├── types.ts                    ← RestaurantConfig, Testimonial, HoursRow, etc.
├── RestaurantSite.tsx          ← Composant racine, single prop
├── styles.css                  ← Tokens oklch + CSS port direct (scopé .rs2-*)
├── lib/
│   ├── fonts.ts                ← next/font/google preload conditionnel par preset
│   └── hexToOklch.ts           ← util conversion hex → oklch
├── data/
│   ├── tire-bouchon.ts         ← démo bistrot français editorial banner
│   ├── sushi-zen.ts            ← démo japonais modern split
│   ├── pizza-napoli.ts         ← démo pizzeria classic banner
│   └── index.ts                ← export central + DEMO_CONFIGS
└── components/
    ├── Navbar.tsx              ← sticky transparent → solid
    ├── Hero.tsx                ← dispatcher
    ├── HeroBanner.tsx          ← full-bleed Ken Burns 22s
    ├── HeroSplit.tsx           ← 50/50 Ken Burns 18s
    ├── About.tsx               ← drop-cap editorial
    ├── MenuTeaser.tsx          ← 4 items grid 4-col
    ├── Gallery.tsx             ← bento 6-col asymétrique
    ├── Testimonials.tsx        ← 3 cards stars + serif quote
    ├── Practical.tsx           ← infos + MapEmbed
    ├── MapEmbed.tsx            ← iframe Google Maps grayscale
    ├── ReservationStrip.tsx    ← bandeau display 120px
    ├── Footer.tsx              ← 4 cols + "Propulsé par Ruliz"
    ├── FloatingReserveCTA.tsx  ← pill accent flottant top-right
    ├── ScrollProgress.tsx      ← bar 2px haut de page
    ├── LenisProvider.tsx       ← smooth scroll
    ├── Reveal.tsx              ← Framer Motion whileInView helper
    └── primitives/
        ├── Btn.tsx
        ├── SectionLabel.tsx
        ├── Monogram.tsx
        ├── Stars.tsx
        └── Photo.tsx
```

## Numérotation des sections

Auto-générée dans `RestaurantSite.tsx` selon les options. Exemples :

- Toutes sections ON : `01 À propos / 02 Carte / 03 Galerie / 04 On en parle / 05 Pratique`
- Sans galerie ni témoignages : `01 À propos / 02 Carte / 03 Pratique`

## Animations

- **Ken Burns** : zoom + drift CSS, 18s sur split, 22s sur banner.
- **Reveal scroll** : `<Reveal>` wrapper Framer Motion → fade-up 28px, 0.9s, ease `cubic-bezier(.2,.7,.2,1)`, delay stagger `0.08s × index`.
- **Lenis smooth scroll** : actif sur tout le site (raf loop, smoothWheel only).
- **CTA flottant** : opacity + translateY transitionnés. Apparaît après 55% du viewport, se masque sur `#book`.

## Tokens couleur (oklch)

```css
--bg:           oklch(0.985 0.005 85)
--surface:      oklch(0.965 0.008 85)
--ink:          oklch(0.18 0.01 80)
--muted:        oklch(0.52 0.008 80)
--rule:         oklch(0.90 0.008 80)
--accent:       /* injecté via config */
--on-accent:    oklch(0.985 0.005 85)
```

Le dark mode swap les valeurs via `[data-theme="dark"]`. L'accent reste celui du resto.

## Préview démo

Route dédiée à la phase de validation :

- `/dashboard/site-preview` → 3 configs avec toggle bottom-left

Cette route est supprimable une fois le template branché sur Prisma.

## Wire Prisma (étape suivante, pas dans ce commit)

Mapping prévu :

```
restaurantName         ← restaurant.nom
tagline                ← restaurant.tagline (à ajouter)
logoUrl                ← restaurant.logoUrl (R2)
bannerUrl              ← restaurant.banniereUrl (R2)
accentColor            ← restaurant.couleurPrimaire (hex → oklch via util)
typographyPreset       ← restaurant.fontStyle ('elegant' → 'classic')
city                   ← restaurant.ville
established            ← restaurant.anneeOuverture (à ajouter)
practical.address      ← restaurant.adresse + codePostal + ville
practical.phone        ← restaurant.telephone
practical.email        ← restaurant.email
practical.hours        ← restaurant.horairesOuverture (parsing à venir)
socials                ← restaurant.instagramUrl, facebookUrl, tiktokUrl
menuUrl                ← /carte/${restaurant.id} (ou slug)
menuTeaser.items       ← top 4 produits affiche=true triés par (cat.position, produit.position)
reservationUrl         ← restaurant.reservationUrl (à ajouter) ou champ JSON site_config
gallery                ← site_config.gallery (JSONB) ou colonne dédiée
testimonials           ← site_config.testimonials (JSONB)
about (title/body/image/signature)  ← site_config.about (JSONB)
options (heroLayout, theme, aboutImageLeft, show*)  ← site_config.options (JSONB)
```
