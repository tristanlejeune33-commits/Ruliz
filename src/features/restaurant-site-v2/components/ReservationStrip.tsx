import type { RestaurantConfig } from "../types";
import { Btn } from "./primitives/Btn";
import { Reveal } from "./Reveal";

interface ReservationStripProps {
  config: RestaurantConfig;
}

/**
 * Bandeau Réservation grand format — surface alternée, padding généreux.
 *
 * Le titre coupé en 2 lignes :
 *   "Réservez," / "nous gardons la place." (italique)
 *
 * Section ID = "book" — utilisé par FloatingReserveCTA pour se masquer
 * quand on l'atteint (évite la redondance visuelle).
 */
export function ReservationStrip({ config }: ReservationStripProps) {
  if (!config.reservationUrl) return null;

  return (
    <section id="book" className="rs2-reservation">
      <div className="rs2-container">
        <Reveal>
          <span className="rs2-reservation-sub">Réservation en ligne</span>
        </Reveal>
        <Reveal index={1}>
          <h2 className="rs2-display rs2-reservation-title">
            Réservez,
            <br />
            <span className="rs2-display-italic">
              nous gardons la place.
            </span>
          </h2>
        </Reveal>
        <Reveal index={2}>
          <Btn href={config.reservationUrl} external variant="primary" arrow>
            Réserver une table
          </Btn>
        </Reveal>
      </div>
    </section>
  );
}
