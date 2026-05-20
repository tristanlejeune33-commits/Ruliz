/**
 * Export central des 3 configs démo pour la phase de validation.
 * Une fois la maquette validée visuellement, on plugera la vraie query
 * Prisma et ce fichier deviendra superflu.
 */

export { tireBouchonConfig } from "./tire-bouchon";
export { sushiZenConfig } from "./sushi-zen";
export { pizzaNapoliConfig } from "./pizza-napoli";

import { tireBouchonConfig } from "./tire-bouchon";
import { sushiZenConfig } from "./sushi-zen";
import { pizzaNapoliConfig } from "./pizza-napoli";
import type { RestaurantConfig } from "../types";

export type DemoSlug = "tire-bouchon" | "sushi-zen" | "pizza-napoli";

export const DEMO_CONFIGS: Record<DemoSlug, RestaurantConfig> = {
  "tire-bouchon": tireBouchonConfig,
  "sushi-zen": sushiZenConfig,
  "pizza-napoli": pizzaNapoliConfig,
};

export const DEMO_OPTIONS: Array<{
  slug: DemoSlug;
  label: string;
  meta: string;
}> = [
  {
    slug: "tire-bouchon",
    label: "Le Tire-Bouchon",
    meta: "Bistrot français · editorial · banner",
  },
  {
    slug: "sushi-zen",
    label: "Sushi Zen",
    meta: "Japonais omakase · modern · split",
  },
  {
    slug: "pizza-napoli",
    label: "Pizza Napoli",
    meta: "Pizzeria · classic · banner",
  },
];
