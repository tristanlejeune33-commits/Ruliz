import type { TestimonialItem } from "../types";

interface TestimonialsProps {
  items: TestimonialItem[];
}

/**
 * Cartes témoignages — étoiles + citation + auteur/source.
 * Grille responsive 1 → 2 → 3 colonnes.
 */
export function Testimonials({ items }: TestimonialsProps) {
  if (!items.length) return null;

  return (
    <section id="testimonials" className="rs-section">
      <div className="rs-container">
        <div className="rs-section__head">
          <p className="rs-eyebrow">Ils en parlent</p>
          <h2 className="rs-display rs-section__title">Avis clients</h2>
          <p className="rs-section__subtitle">
            Quelques retours récents de nos clients.
          </p>
        </div>

        <div className="rs-testimonials__grid">
          {items.map((t, i) => (
            <article key={`${t.name}-${i}`} className="rs-testimonial">
              {typeof t.rating === "number" && (
                <div className="rs-testimonial__stars" aria-label={`${t.rating} sur 5`}>
                  {"★".repeat(Math.round(t.rating))}
                  {"☆".repeat(Math.max(0, 5 - Math.round(t.rating)))}
                </div>
              )}
              <p className="rs-testimonial__text">« {t.text} »</p>
              <p className="rs-testimonial__author">
                — <strong>{t.name}</strong>
                {t.source && <span> · {t.source}</span>}
                {t.date && <span> · {t.date}</span>}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
