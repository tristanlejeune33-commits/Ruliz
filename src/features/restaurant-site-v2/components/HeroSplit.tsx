import type { RestaurantConfig } from "../types";
import { Btn } from "./primitives/Btn";
import { Photo } from "./primitives/Photo";

interface HeroSplitProps {
  config: RestaurantConfig;
}

/**
 * Hero split 50/50.
 *
 * - Gauche : meta eyebrow ("Ville · Depuis YYYY"), titre display géant
 *   (split en 2 lignes avec dernière ligne en italique), tagline muted,
 *   2 CTAs.
 * - Droite : photo Ken Burns 18s.
 *
 * Le split du titre :
 *   "Le Tire-Bouchon" (2 mots) → "Le" / "Tire-Bouchon" (italique)
 *   "Sushi" (1 mot) → "Sushi" (sans italique)
 *   3+ mots → premier mot / reste italique
 */
export function HeroSplit({ config }: HeroSplitProps) {
  const photoSrc =
    config.heroImage ?? config.bannerUrl ?? "";

  // Split title — first word on line 1, rest italic on line 2
  const words = config.restaurantName.trim().split(/\s+/);
  const line1 = words.length >= 2 ? words[0] : config.restaurantName;
  const line2 = words.length >= 2 ? words.slice(1).join(" ") : null;

  return (
    <section id="top" className="rs2-hero">
      <div className="rs2-hero-text">
        <div className="rs2-hero-meta">
          <span className="rs2-eyebrow">
            {config.city} · Depuis {config.established}
          </span>
          <span className="dot" aria-hidden />
          <span className="rs2-eyebrow">Restaurant</span>
        </div>

        <h1 className="rs2-display rs2-hero-title">
          {line1}
          {line2 && (
            <>
              <br />
              <span className="rs2-display-italic">{line2}</span>
            </>
          )}
        </h1>

        <p className="rs2-hero-tagline">{config.tagline}</p>

        <div className="rs2-hero-ctas">
          <Btn href={config.menuUrl} variant="primary" arrow>
            Voir la carte
          </Btn>
          {config.reservationUrl && (
            <Btn href={config.reservationUrl} external variant="secondary">
              Réserver
            </Btn>
          )}
        </div>
      </div>

      <div className="rs2-hero-photo">
        {photoSrc && (
          <Photo src={photoSrc} alt={`${config.restaurantName} — ${config.tagline}`} priority />
        )}
        <div className="rs2-hero-scroll" aria-hidden>
          <div className="bar" />
          <span>Scroll</span>
        </div>
      </div>
    </section>
  );
}
