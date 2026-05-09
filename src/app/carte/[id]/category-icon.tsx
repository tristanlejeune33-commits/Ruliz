"use client";

import {
  Salad,
  Beef,
  Wine,
  Coffee,
  IceCreamCone,
  Pizza,
  Sandwich,
  Soup,
  Fish,
  Cookie,
  Apple,
  Beer,
  Citrus,
  Cake,
  Croissant,
  Drumstick,
  Egg,
  GlassWater,
  Grape,
  Leaf,
  Milk,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapping codes → icons Lucide.
 * Le restaurateur enregistre un code court (ex: "salad", "grill", "wine")
 * dans le champ `categorie.icone` du dashboard. Si le code n'est pas
 * reconnu ou null, on tombe sur UtensilsCrossed (icône générique).
 */
const ICON_MAP: Record<string, LucideIcon> = {
  // Entrées / salades
  salad: Salad,
  salade: Salad,
  soup: Soup,
  soupe: Soup,
  // Plats principaux
  grill: Beef,
  grillade: Beef,
  beef: Beef,
  viande: Beef,
  poulet: Drumstick,
  drumstick: Drumstick,
  fish: Fish,
  poisson: Fish,
  // Pizzas / sandwichs / pâtes
  pizza: Pizza,
  sandwich: Sandwich,
  // Desserts / sucré
  cake: Cake,
  dessert: Cake,
  cookie: Cookie,
  patisserie: Croissant,
  croissant: Croissant,
  glace: IceCreamCone,
  icecream: IceCreamCone,
  // Boissons
  bottle: Wine,
  bouteille: Wine,
  wine: Wine,
  vin: Wine,
  beer: Beer,
  biere: Beer,
  coffee: Coffee,
  cafe: Coffee,
  water: GlassWater,
  eau: GlassWater,
  // Fruits / vegan
  lemon: Citrus,
  citrus: Citrus,
  apple: Apple,
  fruit: Apple,
  grape: Grape,
  raisin: Grape,
  vegan: Leaf,
  leaf: Leaf,
  bio: Leaf,
  // Petit-dej / brunch
  egg: Egg,
  oeuf: Egg,
  milk: Milk,
  // Specials
  sparkles: Sparkles,
  nouveau: Sparkles,
  signature: Sparkles,
};

interface CategoryIconProps {
  code: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({ code, className, style }: CategoryIconProps) {
  const key = code?.trim().toLowerCase();
  const Icon = (key && ICON_MAP[key]) || UtensilsCrossed;
  return <Icon className={className} style={style} aria-hidden />;
}
