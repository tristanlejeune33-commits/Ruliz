import type { GalleryItem } from "../types";

interface GalleryProps {
  items: GalleryItem[];
}

/**
 * Galerie photos — grille 2 colonnes mobile, 3 colonnes desktop, carrée.
 * Hover : zoom léger + caption qui apparaît.
 */
export function Gallery({ items }: GalleryProps) {
  if (!items.length) return null;

  return (
    <section id="gallery" className="rs-section">
      <div className="rs-container">
        <div className="rs-section__head">
          <p className="rs-eyebrow">Galerie</p>
          <h2 className="rs-display rs-section__title">L&apos;ambiance</h2>
          <p className="rs-section__subtitle">
            Un aperçu de notre univers, en images.
          </p>
        </div>

        <div className="rs-gallery__grid">
          {items.map((item, i) => (
            <figure key={`${item.url}-${i}`} className="rs-gallery__item">
              <img src={item.url} alt={item.alt || item.caption || ""} loading="lazy" />
              {item.caption && (
                <figcaption className="rs-gallery__caption">{item.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
