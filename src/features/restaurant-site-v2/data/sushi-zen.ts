import type { RestaurantConfig } from "../types";

/**
 * DÉMO 2 — Sushi Zen
 * Japonais minimaliste, accent sauge, preset modern, heroLayout split.
 */
export const sushiZenConfig: RestaurantConfig = {
  restaurantName: "Sushi Zen",
  tagline: "Comptoir omakase, neuf places, un seul service.",
  logoUrl: null,
  bannerUrl:
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=2200&q=80",
  heroImage:
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1600&q=80",
  accentColor: "oklch(0.55 0.06 145)",
  typographyPreset: "modern",
  city: "Lyon",
  established: 2021,

  about: {
    title: "Neuf places. Un comptoir. Aucun menu.",
    body: [
      "Hiro Tanaka, itamae depuis dix-huit ans, a appris Osaka, puis Londres, avant de poser son comptoir en cèdre japonais rue du Bât-d'Argent. Il achète le poisson le matin, dessine le menu l'après-midi, le sert le soir — neuf places assises, jamais plus.",
      "Le service unique commence à 19h30 précises. On dîne ensemble, on parle peu, on regarde beaucoup. C'est le cœur de l'omakase : faire confiance.",
    ],
    image:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80",
    signature: "— Hiro Tanaka, itamae",
  },

  menuTeaser: {
    title: "Quatre temps, un seul rythme.",
    items: [
      {
        num: 1,
        name: "Otsumami",
        price: "—",
        image:
          "https://images.unsplash.com/photo-1607301406259-dfb186e15de3?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 2,
        name: "Nigiri 8 pièces",
        price: "—",
        image:
          "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 3,
        name: "Maki signature",
        price: "—",
        image:
          "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 4,
        name: "Wagashi",
        price: "—",
        image:
          "https://images.unsplash.com/photo-1606101273945-e9eba91c0dc4?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  gallery: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1607301406259-dfb186e15de3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1606101273945-e9eba91c0dc4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1535007813616-79dc02ba4021?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1633478062482-790e3a85c70d?auto=format&fit=crop&w=1200&q=80",
  ],

  testimonials: [
    {
      rating: 5,
      text: "Le silence d'un grand comptoir n'est pas vide, il est plein. Ici on l'écoute.",
      author: "Hugo R. · Le Monde",
    },
    {
      rating: 5,
      text: "Une rigueur sans austérité. Chaque pièce arrive exactement quand il faut.",
      author: "Anne C. · Gault & Millau",
    },
    {
      rating: 5,
      text: "Hiro ne cherche pas à impressionner. C'est précisément pour ça qu'il y arrive.",
      author: "Théo M. · Atabula",
    },
  ],

  practical: {
    address: "4 rue du Bât-d'Argent, 69001 Lyon",
    phone: "+33 4 78 28 50 90",
    email: "comptoir@sushizen-lyon.fr",
    hours: [
      { day: "lun", hours: null },
      { day: "mar", hours: "19h30 · service unique" },
      { day: "mer", hours: "19h30 · service unique" },
      { day: "jeu", hours: "19h30 · service unique" },
      { day: "ven", hours: "19h30 · service unique" },
      { day: "sam", hours: "19h30 · service unique" },
      { day: "dim", hours: null },
    ],
    googleMapsUrl: "https://maps.google.com/?q=4+rue+du+Bât-d'Argent+Lyon",
  },

  socials: {
    instagram: "@sushizen.lyon",
    facebook: null,
    tiktok: null,
  },

  reservationUrl: "https://thefork.fr/sushi-zen",
  menuUrl: "/carte/sushi-zen",

  options: {
    showGallery: true,
    showTestimonials: true,
    showReservation: true,
    showMap: true,
    theme: "light",
    aboutImageLeft: false,
    heroLayout: "split",
  },
};
