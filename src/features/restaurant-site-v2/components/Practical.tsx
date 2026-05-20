import type { RestaurantConfig } from "../types";
import { MapEmbed } from "./MapEmbed";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./primitives/SectionLabel";

interface PracticalProps {
  config: RestaurantConfig;
  sectionNum: number;
}

const DAY_LABELS: Record<string, string> = {
  lun: "Lun",
  mar: "Mar",
  mer: "Mer",
  jeu: "Jeu",
  ven: "Ven",
  sam: "Sam",
  dim: "Dim",
};

/**
 * Section "Pratique" — infos cliquables à gauche, map à droite.
 *
 * Highlight du jour courant dans le tableau d'horaires :
 *   JS Date.getDay() : 0=dim, 1=lun, ..., 6=sam
 *   Nos rows sont ordonnées lun→dim → indexFromJsDay convertit.
 */
export function Practical({ config, sectionNum }: PracticalProps) {
  // Lundi=0, Dimanche=6
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <section id="practical" className="rs2-section">
      <div className="rs2-container">
        <SectionLabel num={sectionNum} name="Pratique" />

        <div className="rs2-menu-head">
          <Reveal>
            <h2 className="rs2-display rs2-info-title">Nous trouver.</h2>
          </Reveal>
        </div>

        <div className="rs2-info">
          <Reveal index={0}>
            <div className="rs2-info-blocks">
              <div className="rs2-info-block">
                <span className="label">Adresse</span>
                <div className="value">
                  <a
                    href={config.practical.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rs2-link"
                  >
                    {config.practical.address}
                  </a>
                </div>
              </div>

              <div className="rs2-info-block">
                <span className="label">Téléphone</span>
                <div className="value">
                  <a
                    href={`tel:${config.practical.phone.replace(/\s+/g, "")}`}
                    className="rs2-link"
                  >
                    {config.practical.phone}
                  </a>
                </div>
              </div>

              <div className="rs2-info-block">
                <span className="label">Email</span>
                <div className="value">
                  <a href={`mailto:${config.practical.email}`} className="rs2-link">
                    {config.practical.email}
                  </a>
                </div>
              </div>

              <div className="rs2-info-block">
                <span className="label">Horaires</span>
                <div className="value">
                  <div className="rs2-hours-table">
                    {config.practical.hours.map((row, i) => {
                      const isToday = i === todayIndex;
                      const isClosed = row.hours === null;
                      return (
                        <div
                          key={row.day}
                          className={`rs2-hours-row${isToday ? " today" : ""}${isClosed ? " closed" : ""}`}
                        >
                          <span className="day">
                            {isToday && <span className="today-dot" aria-hidden />}{" "}
                            {DAY_LABELS[row.day] ?? row.day}
                          </span>
                          <span />
                          <span className="hrs">{row.hours ?? "fermé"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal index={1}>
            <MapEmbed
              googleMapsUrl={config.practical.googleMapsUrl}
              address={config.practical.address}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
