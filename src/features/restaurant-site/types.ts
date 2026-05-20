/**
 * Types du module "Site web restaurant".
 *
 * Le restaurateur peut activer en plus de sa carte un mini-site vitrine
 * mono-page (hero, à-propos, mise en avant menu, galerie, témoignages,
 * pratiques, réservation). Le contenu vit dans une colonne JSONB
 * `restaurants.site_config` — pas de table séparée, on évite une migration
 * lourde et on profite du cache existant.
 *
 * Toutes les sections sont OPTIONNELLES : le restaurateur peut tout cacher
 * sauf le hero qui est toujours présent (sinon la page ne sert à rien).
 */

/**
 * Variantes visuelles du hero — pilotent le layout.
 *  - `split`    : image à gauche, texte+CTA à droite (élégant, brasserie)
 *  - `banner`   : full-bleed image avec overlay sombre + texte centré (immersif)
 *  - `centered` : minimaliste — pas d'image, gros titre + sous-titre centré
 *  - `video`    : full-bleed vidéo loop muted en arrière-plan + overlay
 */
export type HeroVariant = "split" | "banner" | "centered" | "video";

/**
 * Toggles des sections — par défaut TOUT est ON sauf témoignages
 * (un restaurant qui démarre n'a pas forcément de reviews à montrer).
 */
export interface SectionToggles {
  about: boolean;
  menuTeaser: boolean;
  gallery: boolean;
  testimonials: boolean;
  practical: boolean;
  reservation: boolean;
  team: boolean;
  faq: boolean;
}

export interface HeroConfig {
  variant: HeroVariant;
  /** Titre principal (h1). Défaut = nom du resto. */
  title?: string;
  /** Sous-titre (1-2 lignes). */
  subtitle?: string;
  /** URL R2 de l'image hero. Si vide → banniereUrl du resto. */
  imageUrl?: string;
  /** URL R2 d'une vidéo (variant `video`). MP4 recommandé, ≤10s, ≤5MB. */
  videoUrl?: string;
  /** Label du CTA principal (ex: "Voir la carte"). */
  ctaLabel?: string;
  /** URL du CTA (interne ou externe). Défaut = `/carte/{id}`. */
  ctaUrl?: string;
  /** Eyebrow texte au-dessus du titre (chip discret). Ex: "Cuisine traditionnelle française". */
  eyebrow?: string;
}

export interface AboutConfig {
  title?: string;
  text?: string;
  /** Image illustrative (chef, salle, plat signature). */
  imageUrl?: string;
}

export interface MenuTeaserConfig {
  /** Titre de la section (ex: "Notre carte"). */
  title?: string;
  /** Phrase d'accroche au-dessus du bouton "Voir la carte". */
  subtitle?: string;
  /** Label du CTA — défaut "Voir la carte complète". */
  ctaLabel?: string;
}

export interface GalleryItem {
  url: string;
  caption?: string;
  /** Alt accessibilité (recommandé). */
  alt?: string;
}

export interface TestimonialItem {
  /** Nom du client (ex: "Marie L."). */
  name: string;
  text: string;
  /** Note sur 5 (étoiles). Optionnel. */
  rating?: number;
  /** Source — "Google", "TripAdvisor", "À table"... */
  source?: string;
  /** Date au format texte (ex: "Mai 2026"). */
  date?: string;
}

export interface PracticalConfig {
  /** Numéro de téléphone affiché (clickable tel:). */
  phone?: string;
  /** Email de contact (clickable mailto:). */
  email?: string;
  /**
   * Horaires d'ouverture en texte libre, multi-lignes acceptées.
   * Ex : "Mardi-Samedi : 12h-14h30 / 19h-22h30\nFermé dimanche-lundi"
   */
  schedule?: string;
  /** URL Google Maps de l'adresse (override automatique avec adresse resto si vide). */
  mapsUrl?: string;
}

export interface ReservationConfig {
  /**
   * URL externe (TheFork, Zenchef, OpenTable…) — si défini, prend le pas
   * sur le phone.
   */
  url?: string;
  /** Numéro de réservation (clickable). */
  phone?: string;
  /** Label du CTA — défaut "Réserver une table". */
  label?: string;
}

export interface SeoConfig {
  /** <title> de la page. Défaut = "{nom} — Restaurant à {ville}". */
  title?: string;
  /** <meta description>. Défaut = description du resto. */
  description?: string;
}

export interface StyleOverrides {
  /**
   * Famille de typo display utilisée pour les titres.
   *  - `serif`     : Playfair-style, classique
   *  - `sans`      : Inter, moderne minimal
   *  - `display`   : Inter Display / Geist Bold, impact
   */
  fontHeading?: "serif" | "sans" | "display";
  /**
   * Couleur d'accent override — sinon prend `restaurant.couleurPrimaire`.
   * Format `#RRGGBB`.
   */
  accentColor?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Configuration complète du mini-site, telle que stockée dans
 * `restaurants.site_config` (JSONB).
 */
export interface RestaurantSiteConfig {
  /** Version du schéma — pour les migrations futures du JSON. */
  version: 1;
  sections: SectionToggles;
  hero: HeroConfig;
  about?: AboutConfig;
  menuTeaser?: MenuTeaserConfig;
  gallery?: GalleryItem[];
  testimonials?: TestimonialItem[];
  practical?: PracticalConfig;
  reservation?: ReservationConfig;
  seo?: SeoConfig;
  style?: StyleOverrides;
  /** Section "Notre équipe" (chef + serveurs). */
  team?: TeamMember[];
  /** Section "Questions fréquentes". */
  faq?: FaqItem[];
  /** Slug URL — éditable par le user. Persisté dans `restaurants.site_slug`. */
  slug?: string;
}

/**
 * Branding hérité du Restaurant — passé au composant racine en plus du
 * config, pour que les sections aient accès à la palette/typo/devise/etc.
 */
export interface RestaurantSiteBranding {
  /** ID du resto (pour le CTA "Voir la carte"). */
  id: string;
  nom: string;
  description: string | null;
  logoUrl: string | null;
  banniereUrl: string | null;
  /** Couleur d'accent — défaut indigo Ruliz. */
  couleurPrimaire: string | null;
  couleurSecondaire: string | null;
  /** Couleur de fond globale. */
  couleurFond: string | null;
  /** Couleur des titres. */
  couleurTexteTitre: string | null;
  /** light / dark — pilote les contrasts. */
  theme: "light" | "dark";
  /** Style de typo display global (modern/editorial/elegant). */
  fontStyle: "modern" | "editorial" | "elegant";
  ville: string | null;
  pays: string | null;
  adresse: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  siteWeb: string | null;
  googleReviewUrl: string | null;
}

/**
 * Génère un config par défaut à partir du resto — utilisé à la première
 * activation de la fonctionnalité (l'utilisateur peut ensuite tout
 * personnaliser via l'éditeur).
 */
export function defaultSiteConfig(
  branding: Pick<RestaurantSiteBranding, "nom" | "description">,
): RestaurantSiteConfig {
  return {
    version: 1,
    sections: {
      about: true,
      menuTeaser: true,
      gallery: false, // off par défaut tant qu'aucune image n'est ajoutée
      testimonials: false, // off tant qu'aucun témoignage
      practical: true,
      reservation: true,
      team: false, // off par défaut
      faq: false,
    },
    hero: {
      variant: "split",
      title: branding.nom,
      subtitle:
        branding.description ??
        "Une cuisine de caractère, des produits locaux, des moments à partager.",
      ctaLabel: "Voir la carte",
      eyebrow: "Restaurant",
    },
    about: {
      title: "Notre maison",
      text:
        "Présentez en quelques lignes votre concept, votre cuisine, votre histoire ou votre équipe. Ce texte donne envie aux futurs clients de pousser la porte.",
    },
    menuTeaser: {
      title: "La carte",
      subtitle: "Découvrez nos plats, mis à jour régulièrement.",
      ctaLabel: "Voir la carte complète",
    },
    practical: {
      schedule: "Mardi - Samedi\n12h00 - 14h30 · 19h00 - 22h30\nFermé dimanche et lundi",
    },
    reservation: {
      label: "Réserver une table",
    },
  };
}

/**
 * Templates pré-faits — onboarding 1 clic.
 *
 * Le restaurateur choisit un kit qui pré-remplit hero + sections + style,
 * puis personnalise. Beaucoup plus rapide que partir de zéro.
 */
export interface SiteTemplate {
  id: "bistrot" | "moderne" | "pizzeria" | "gastronomique" | "brasserie";
  label: string;
  description: string;
  preview: string; // emoji ou icône
  apply: (fallback: { nom: string; description: string | null }) => RestaurantSiteConfig;
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "bistrot",
    label: "Bistrot français",
    description:
      "Hero split, ambiance chaleureuse, typo classique. Pour brasseries et bistrots traditionnels.",
    preview: "🍷",
    apply: (fb) => ({
      ...defaultSiteConfig(fb),
      hero: {
        variant: "split",
        title: fb.nom,
        subtitle:
          fb.description ?? "Une cuisine de tradition, des produits du marché, l'esprit du quartier.",
        eyebrow: "Bistrot français",
        ctaLabel: "Voir la carte",
      },
      about: {
        title: "Notre histoire",
        text: "Depuis ouverture, nous mettons à l'honneur la cuisine française authentique avec des produits frais sélectionnés chaque matin auprès de nos producteurs.",
      },
      style: { fontHeading: "serif", accentColor: "#8b3a1f" },
    }),
  },
  {
    id: "moderne",
    label: "Bistronomique moderne",
    description:
      "Hero banner immersif, dark mode, typo géométrique. Pour restaurants néo-bistro et cuisine créative.",
    preview: "✨",
    apply: (fb) => ({
      ...defaultSiteConfig(fb),
      hero: {
        variant: "banner",
        title: fb.nom,
        subtitle: fb.description ?? "Cuisine d'auteur, produits sourcés, atmosphère contemporaine.",
        eyebrow: "Cuisine contemporaine",
        ctaLabel: "Découvrir la carte",
      },
      about: {
        title: "Le projet",
        text: "Une cuisine engagée, ouverte sur le monde, qui respecte les saisons et les producteurs locaux. Chaque assiette est pensée comme un voyage.",
      },
      style: { fontHeading: "sans", accentColor: "#2d5a3f" },
    }),
  },
  {
    id: "pizzeria",
    label: "Pizzeria conviviale",
    description:
      "Hero split, palette chaude, typo display. Pour pizzerias, trattorias, cuisines italiennes.",
    preview: "🍕",
    apply: (fb) => ({
      ...defaultSiteConfig(fb),
      hero: {
        variant: "split",
        title: fb.nom,
        subtitle: fb.description ?? "Pâte au levain naturel, ingrédients italiens, four à bois.",
        eyebrow: "Trattoria",
        ctaLabel: "Voir nos pizzas",
      },
      about: {
        title: "L'authentique",
        text: "Une pizza napolitaine traditionnelle, façonnée à la main, cuite au feu de bois 90 secondes. Les meilleurs ingrédients d'Italie pour un goût inimitable.",
      },
      style: { fontHeading: "display", accentColor: "#d44a2e" },
    }),
  },
  {
    id: "gastronomique",
    label: "Gastronomique épuré",
    description:
      "Hero centered minimaliste, beaucoup de blanc, typo display fine. Pour étoilés et fine dining.",
    preview: "🥂",
    apply: (fb) => ({
      ...defaultSiteConfig(fb),
      hero: {
        variant: "centered",
        title: fb.nom,
        subtitle: fb.description ?? "Une expérience culinaire d'exception.",
        eyebrow: "Restaurant",
        ctaLabel: "Notre carte",
      },
      about: {
        title: "Une vision",
        text: "Chaque plat est l'aboutissement d'une recherche, d'une technique, d'une émotion. Un parcours sensoriel orchestré avec exigence.",
      },
      style: { fontHeading: "display", accentColor: "#1a1a1a" },
    }),
  },
  {
    id: "brasserie",
    label: "Brasserie de gare",
    description:
      "Hero banner vintage, ambiance Art Nouveau, typo serif éditoriale. Pour brasseries historiques.",
    preview: "🍻",
    apply: (fb) => ({
      ...defaultSiteConfig(fb),
      hero: {
        variant: "banner",
        title: fb.nom,
        subtitle: fb.description ?? "Depuis des décennies, une brasserie au cœur de la ville.",
        eyebrow: "Brasserie traditionnelle",
        ctaLabel: "Voir la carte",
      },
      about: {
        title: "Une institution",
        text: "Banquettes de cuir, plafond mouluré, tables en marbre. Une brasserie où l'on retrouve les classiques de la cuisine française dans une atmosphère intemporelle.",
      },
      style: { fontHeading: "serif", accentColor: "#a16207" },
    }),
  },
];

