import type { RestaurantConfig } from "../types";
import { HeroBanner } from "./HeroBanner";
import { HeroSplit } from "./HeroSplit";

interface HeroProps {
  config: RestaurantConfig;
}

/**
 * Dispatcher Hero — choisit la variante selon options.heroLayout.
 */
export function Hero({ config }: HeroProps) {
  return config.options.heroLayout === "banner" ? (
    <HeroBanner config={config} />
  ) : (
    <HeroSplit config={config} />
  );
}
