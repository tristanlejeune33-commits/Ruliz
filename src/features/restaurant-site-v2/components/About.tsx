import type { RestaurantConfig } from "../types";
import { Photo } from "./primitives/Photo";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./primitives/SectionLabel";

interface AboutProps {
  config: RestaurantConfig;
  /** Numéro de section (label visuel "01 / À PROPOS"). */
  sectionNum: number;
}

/**
 * Section "À propos" — grid 2 colonnes inversable.
 *
 * - aboutImageLeft = true  → photo gauche, texte droite (par défaut)
 * - aboutImageLeft = false → texte gauche, photo droite (direction: rtl)
 *
 * Drop-cap géante sur premier `<p>` en preset editorial via CSS
 * `::first-letter` du `.rs2-about-body`.
 */
export function About({ config, sectionNum }: AboutProps) {
  const reversed = !config.options.aboutImageLeft;

  return (
    <section id="about" className="rs2-section">
      <div className="rs2-container">
        <SectionLabel num={sectionNum} name="À propos" />
        <div className={`rs2-about${reversed ? " reverse" : ""}`}>
          <Reveal index={0}>
            <div className="rs2-about-photo">
              <Photo
                src={config.about.image}
                alt={config.about.title}
                fallbackLabel={config.restaurantName}
              />
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="rs2-about-text">
              <h2 className="rs2-display rs2-about-title">
                {config.about.title}
              </h2>
              <div className="rs2-about-body">
                {config.about.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {config.about.signature && (
                <p className="rs2-about-sign">{config.about.signature}</p>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
