import type { RestaurantConfig } from "../types";
import { Photo } from "./primitives/Photo";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./primitives/SectionLabel";

interface GalleryProps {
  config: RestaurantConfig;
  sectionNum: number;
}

/**
 * Galerie bento — grille 6 col × auto-rows 160px, 8 cells avec spans
 * asymétriques définis dans le CSS (`nth-child(1)` à `nth-child(8)`).
 *
 * Slice à 8 max — au-delà ça casse le pattern bento. Si moins de 6,
 * la section reste mais sera courte (acceptable).
 */
export function Gallery({ config, sectionNum }: GalleryProps) {
  const items = config.gallery.slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section id="gallery" className="rs2-section">
      <div className="rs2-container">
        <SectionLabel num={sectionNum} name="Galerie" />

        <div className="rs2-menu-head">
          <Reveal>
            <h2 className="rs2-display rs2-menu-title">
              L&apos;ambiance, en images.
            </h2>
          </Reveal>
        </div>

        <div className="rs2-gallery">
          {items.map((src, i) => (
            <Reveal key={src + i} index={i} className="rs2-gallery-cell">
              <Photo src={src} alt="" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
