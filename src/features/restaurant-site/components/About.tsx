import type { AboutConfig } from "../types";

interface AboutProps {
  config: AboutConfig;
}

/**
 * Section "À propos" — texte + image optionnelle.
 * Si pas de config (ou config vide), on retourne null (toggle off implicite).
 */
export function About({ config }: AboutProps) {
  const title = config.title || "Notre maison";
  const text = config.text || "";
  const imageUrl = config.imageUrl;

  if (!text && !imageUrl) return null;

  return (
    <section id="about" className="rs-section">
      <div className="rs-container">
        <div className="rs-about__grid">
          {imageUrl && (
            <div className="rs-about__image">
              <img src={imageUrl} alt={title} />
            </div>
          )}
          <div>
            <p className="rs-eyebrow">À propos</p>
            <h2 className="rs-display rs-section__title">{title}</h2>
            <p className="rs-about__text" style={{ marginTop: "var(--rs-s-4)" }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
