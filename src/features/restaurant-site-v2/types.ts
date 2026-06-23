/**
 * Restaurant Site — Template éditorial-magazine (v2)
 *
 * Source unique de prop : RestaurantConfig.
 * Le composant racine <RestaurantSite config={config} /> rend le site
 * entier sans rien d'autre.
 *
 * Cf. NOUVEAU_TEMPLATE.md pour la direction artistique validée.
 */

export type TypographyPreset = "editorial" | "modern" | "classic";
export type SiteTheme = "light" | "dark";
export type HeroLayout = "banner" | "split";

/** Un plat highlight pour le Menu Teaser (4 items). */
export interface MenuTeaserItem {
  /** Numérotation affichée en mono (01..04). Auto-mappé à l'index si absent. */
  num: number;
  name: string;
  /** Pré-formatté côté serveur ("18 €", "—" si null/dégustation). */
  price: string;
  /** URL image R2. `null` = pas d'image → placeholder neutre (jamais de fausse photo). */
  image: string | null;
}

/** Un avis client manuel — distinct des avis Google API. */
export interface Testimonial {
  rating: number; // 1..5
  text: string;
  /** "Marie D. · Le Fooding" */
  author: string;
}

/**
 * Une journée d'ouverture. `hours: null` = fermé ce jour-là.
 * Ordre fixe lundi → dimanche dans l'array `practical.hours`.
 */
export interface HoursRow {
  day: string; // "lun", "mar", "mer", "jeu", "ven", "sam", "dim"
  hours: string | null; // ex: "12h–14h · 19h–22h30" ou null = fermé
}

export interface RestaurantConfig {
  // -------- Identité --------
  restaurantName: string;
  tagline: string;
  /** PNG/SVG sur R2 ; null = on rend le nom en wordmark display. */
  logoUrl: string | null;
  /** Bannière hero (R2). Fallback hierarchique : heroImage > bannerUrl. */
  bannerUrl: string | null;
  /** Hex ou oklch — mappé en CSS var --accent. */
  accentColor: string;
  /**
   * Couleur de fond des CTAs primary (Voir la carte / Réserver / etc.).
   * Hex ou oklch. Si non défini → ink (dark) en hors-banner, blanc sur
   * banner pour lisibilité.
   */
  buttonBgColor?: string;
  /**
   * Couleur de texte des CTAs primary. Hex ou oklch.
   * Si non défini → bg (light) en hors-banner, ink (dark) sur banner.
   */
  buttonTextColor?: string;
  typographyPreset: TypographyPreset;

  // -------- Méta affichées (chip eyebrow) --------
  city: string;
  established: number;

  // -------- Hero --------
  /** Photo hero si différente de la bannière (split mode utilise heroImage si défini). */
  heroImage?: string;

  // -------- About --------
  about: {
    title: string;
    /** Paragraphes ; <p>{p}</p> chacun. Drop-cap sur premier en preset editorial. */
    body: string[];
    /** Image R2/bannière. `null` = placeholder neutre (jamais de fausse photo). */
    image: string | null;
    /** Optionnel — "— Camille L., cheffe & propriétaire" */
    signature?: string;
  };

  // -------- Menu Teaser --------
  menuTeaser: {
    title: string;
    items: MenuTeaserItem[]; // 4 items typiques (résolus côté loader)
    /**
     * IDs des produits explicitement sélectionnés pour la vitrine.
     * Exposé pour que l'éditeur dashboard puisse pre-remplir le picker.
     * Le rendu site ne lit que `items` (déjà résolus).
     */
    productIds?: string[];
  };

  // -------- Galerie --------
  gallery: string[]; // 6 à 12 URLs, slice à 8 max côté composant

  // -------- Témoignages (optionnels) --------
  testimonials?: Testimonial[];

  // -------- Infos pratiques --------
  practical: {
    address: string;
    phone: string;
    email: string;
    hours: HoursRow[]; // 7 entrées lun→dim
    googleMapsUrl: string;
  };

  // -------- Réseaux sociaux --------
  socials: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
  };

  // -------- CTA --------
  /** URL TheFork/Zenchef ou null (CTA Réserver caché si null). */
  reservationUrl: string | null;
  /** /carte/[id] interne. */
  menuUrl: string;

  // -------- Options visuelles --------
  options: {
    showGallery: boolean;
    showTestimonials: boolean;
    showReservation: boolean;
    /**
     * True = affiche la map Google Maps (iframe + CTA Ouvrir dans Maps)
     * dans la section Pratique. False = section affiche uniquement les
     * infos texte (adresse cliquable + tel + email + horaires) sans
     * embed visuel. Default true pour rétrocompat des sites existants.
     */
    showMap: boolean;
    theme: SiteTheme;
    /** True = photo à gauche, texte à droite ; false = inversé (direction rtl). */
    aboutImageLeft: boolean;
    heroLayout: HeroLayout;
  };
}
