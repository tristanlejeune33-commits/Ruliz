import type { RestaurantConfig } from "../types";
import { Btn } from "./primitives/Btn";
import { Photo } from "./primitives/Photo";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./primitives/SectionLabel";

interface MenuTeaserProps {
  config: RestaurantConfig;
  sectionNum: number;
}

/**
 * Section "Menu" — 4 plats en grille 4 col.
 *
 * - Section avec background var(--surface) pour alterner avec About
 *   (fond surface = légèrement plus chaud que bg)
 * - Numérotation 01-04 en mono, prix tabular, photo aspect 4/5
 * - CTA centré sous la grille → vers `menuUrl`
 */
export function MenuTeaser({ config, sectionNum }: MenuTeaserProps) {
  // Slice 4 items max
  const items = config.menuTeaser.items.slice(0, 4);

  return (
    <section
      id="menu"
      className="rs2-section"
      style={{ background: "var(--surface)" }}
    >
      <div className="rs2-container">
        <SectionLabel num={sectionNum} name="Carte" />

        <div className="rs2-menu-head">
          <Reveal>
            <h2 className="rs2-display rs2-menu-title">
              {config.menuTeaser.title}
            </h2>
          </Reveal>
        </div>

        <div className="rs2-menu-grid">
          {items.map((item, i) => (
            <Reveal key={`${item.num}-${item.name}`} index={i}>
              <article className="rs2-menu-item">
                <div className="rs2-menu-photo">
                  <Photo src={item.image} alt={item.name} />
                </div>
                <span className="rs2-menu-num">
                  {String(item.num).padStart(2, "0")} — Plat
                </span>
                <h3 className="rs2-menu-name">{item.name}</h3>
                <div className="rs2-menu-meta">
                  <span className="rs2-eyebrow">Carte du moment</span>
                  <span className="rs2-menu-price">{item.price}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal index={items.length}>
          <div className="rs2-menu-cta">
            <Btn href={config.menuUrl} variant="primary" arrow>
              Découvrir la carte complète
            </Btn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
