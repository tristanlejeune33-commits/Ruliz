import type { RestaurantConfig } from "../types";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./primitives/SectionLabel";
import { Stars } from "./primitives/Stars";

interface TestimonialsProps {
  config: RestaurantConfig;
  sectionNum: number;
}

/**
 * 3 cards de témoignages : étoiles accent + citation serif + auteur mono.
 *
 * Si moins de 3 testimonials fournis, on affiche ce qu'il y a (CSS grid
 * 3-col se contracte, c'est OK visuellement).
 */
export function Testimonials({ config, sectionNum }: TestimonialsProps) {
  const items = config.testimonials ?? [];
  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="rs2-section">
      <div className="rs2-container">
        <SectionLabel num={sectionNum} name="On en parle" />

        <div className="rs2-menu-head">
          <Reveal>
            <h2 className="rs2-display rs2-menu-title">Ce qu&apos;ils en disent.</h2>
          </Reveal>
        </div>

        <div className="rs2-testimonials">
          {items.map((t, i) => (
            <Reveal key={`${t.author}-${i}`} index={i}>
              <article className="rs2-testimonial">
                <Stars rating={t.rating} />
                <p className="rs2-testimonial-quote">« {t.text} »</p>
                <p className="rs2-testimonial-author">{t.author}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
