import type { RestaurantConfig } from "../types";

/**
 * DÉMO 1 — Le Tire-Bouchon
 * Bistrot français, accent bordeaux, preset editorial, heroLayout banner.
 */
export const tireBouchonConfig: RestaurantConfig = {
  restaurantName: "Le Tire-Bouchon",
  tagline: "Bistrot moderne, produits du marché, vins vivants.",
  logoUrl: null,
  bannerUrl:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2200&q=80",
  accentColor: "oklch(0.42 0.13 22)",
  typographyPreset: "editorial",
  city: "Paris",
  established: 2014,

  about: {
    title: "Le bistrot que vous auriez aimé tenir.",
    body: [
      "Camille a quitté la salle d'un trois étoiles parisien pour ouvrir, rue Saint-Maur, un lieu qui ressemble à ce qu'elle a toujours cherché à table : du goût, de la justesse, et une carte des vins qui n'oublie pas que boire est une joie.",
      "On y vient pour le tartare au couteau, on y revient pour la bavette d'aloyau et la profiterole maison. Le service est sans manières mais regarde tout.",
    ],
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    signature: "— Camille L., cheffe & propriétaire",
  },

  menuTeaser: {
    title: "Une cuisine. Trois mouvements.",
    items: [
      {
        num: 1,
        name: "Tartare au couteau",
        price: "18 €",
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 2,
        name: "Bavette, échalote",
        price: "26 €",
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 3,
        name: "Profiterole maison",
        price: "12 €",
        image:
          "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 4,
        name: "Verre Saint-Joseph",
        price: "8 €",
        image:
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  gallery: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1564759224907-65b945ff0e84?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
  ],

  testimonials: [
    {
      rating: 5,
      text: "On mange comme on lit un bon livre : lentement, en se laissant emmener.",
      author: "Marie D. · Le Fooding",
    },
    {
      rating: 5,
      text: "Une carte courte, une carte tenue. Le vin est superbe et l'addition reste sage.",
      author: "Paul B. · Time Out",
    },
    {
      rating: 5,
      text: "La cheffe a ce talent rare : ne rien faire de gratuit. Chaque assiette a son pourquoi.",
      author: "Inès K. · La Liste",
    },
  ],

  practical: {
    address: "12 rue Saint-Maur, 75011 Paris",
    phone: "+33 1 43 57 02 18",
    email: "bonjour@letire-bouchon.fr",
    hours: [
      { day: "lun", hours: null },
      { day: "mar", hours: "12h–14h · 19h–22h30" },
      { day: "mer", hours: "12h–14h · 19h–22h30" },
      { day: "jeu", hours: "12h–14h · 19h–23h" },
      { day: "ven", hours: "12h–14h · 19h–23h" },
      { day: "sam", hours: "19h–23h" },
      { day: "dim", hours: null },
    ],
    googleMapsUrl: "https://maps.google.com/?q=12+rue+Saint-Maur+Paris",
  },

  socials: {
    instagram: "@letirebouchon",
    facebook: "letirebouchon",
    tiktok: null,
  },

  reservationUrl: "https://thefork.fr/letire-bouchon",
  menuUrl: "/carte/le-tire-bouchon",

  options: {
    showGallery: true,
    showTestimonials: true,
    showReservation: true,
    showMap: true,
    theme: "light",
    aboutImageLeft: true,
    heroLayout: "banner",
  },
};
