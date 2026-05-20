import type { RestaurantConfig } from "../types";

/**
 * DÉMO 3 — Pizza Napoli
 * Italien chaleureux, accent tomate, preset classic, heroLayout banner.
 */
export const pizzaNapoliConfig: RestaurantConfig = {
  restaurantName: "Pizza Napoli",
  tagline: "Pâte de 72 heures, four à bois, tables longues.",
  logoUrl: null,
  bannerUrl:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=2200&q=80",
  accentColor: "oklch(0.58 0.17 28)",
  typographyPreset: "classic",
  city: "Marseille",
  established: 2008,

  about: {
    title: "Une pâte, un feu, une famille.",
    body: [
      "Antonio Esposito a quitté Caserta avec sa mère, sa farine, et l'idée précise qu'une pizza n'est jamais seulement une pizza. Vingt ans plus tard, sa pâte fermente 72 heures et son four à bois ne s'éteint que pour Noël.",
      "On vient pour la margherita. On reste parce que la salle parle fort, parce qu'on goûte la pizza du voisin, parce qu'à minuit Antonio offre encore un café à ceux qui ne veulent pas rentrer.",
    ],
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    signature: "— Antonio Esposito, pizzaiolo",
  },

  menuTeaser: {
    title: "Quatre classiques. Une seule pâte.",
    items: [
      {
        num: 1,
        name: "Margherita",
        price: "11 €",
        image:
          "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 2,
        name: "Diavola",
        price: "13 €",
        image:
          "https://images.unsplash.com/photo-1571066811602-716837d681de?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 3,
        name: "Quattro Stagioni",
        price: "15 €",
        image:
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=900&q=80",
      },
      {
        num: 4,
        name: "Tiramisù",
        price: "7 €",
        image:
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  gallery: [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571066811602-716837d681de?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542834291-c514e77b215e?auto=format&fit=crop&w=1200&q=80",
  ],

  testimonials: [
    {
      rating: 5,
      text: "On dirait qu'on est à Naples. Sauf qu'on est à Marseille. C'est encore mieux.",
      author: "Lucie F. · La Provence",
    },
    {
      rating: 5,
      text: "Une cuisson qu'on n'oublie pas, un service qui rit. La famille au sens noble.",
      author: "Karim S. · 7 sur 7",
    },
    {
      rating: 5,
      text: "À ce prix-là, c'est presque indécent. Et la pâte est meilleure que chez beaucoup d'étoilés.",
      author: "Sophie B. · Yelp",
    },
  ],

  practical: {
    address: "18 rue Sainte, 13001 Marseille",
    phone: "+33 4 91 33 12 04",
    email: "ciao@pizza-napoli.fr",
    hours: [
      { day: "lun", hours: "12h–14h · 19h–23h" },
      { day: "mar", hours: "12h–14h · 19h–23h" },
      { day: "mer", hours: "12h–14h · 19h–23h" },
      { day: "jeu", hours: "12h–14h · 19h–23h30" },
      { day: "ven", hours: "12h–14h · 19h–00h" },
      { day: "sam", hours: "12h–00h · service continu" },
      { day: "dim", hours: "12h–22h" },
    ],
    googleMapsUrl: "https://maps.google.com/?q=18+rue+Sainte+Marseille",
  },

  socials: {
    instagram: "@pizzanapoli.mars",
    facebook: "pizzanapoli.marseille",
    tiktok: "@pizzanapoli",
  },

  reservationUrl: "https://thefork.fr/pizza-napoli",
  menuUrl: "/carte/pizza-napoli",

  options: {
    showGallery: true,
    showTestimonials: true,
    showReservation: true,
    theme: "light",
    aboutImageLeft: true,
    heroLayout: "banner",
  },
};
