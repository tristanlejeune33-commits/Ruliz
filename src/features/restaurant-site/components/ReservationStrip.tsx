import type { ReservationConfig } from "../types";

interface ReservationStripProps {
  config: ReservationConfig;
}

/**
 * Bande accent en bas de page — CTA réservation.
 * Si `url` défini → bouton externe (TheFork, Zenchef, OpenTable, …).
 * Sinon si `phone` défini → bouton `tel:`.
 * Sinon affiche une bande générique vers `mailto:`.
 */
export function ReservationStrip({ config }: ReservationStripProps) {
  const label = config.label || "Réserver une table";
  let href: string | null = null;
  let external = false;

  if (config.url) {
    href = config.url;
    external = true;
  } else if (config.phone) {
    href = `tel:${config.phone.replace(/\s+/g, "")}`;
  }

  if (!href) return null;

  return (
    <section id="reservation" className="rs-reservation">
      <div className="rs-container">
        <div className="rs-reservation__inner">
          <h2 className="rs-reservation__title">Envie de réserver&nbsp;?</h2>
          <p style={{ maxWidth: "44ch", margin: 0 }}>
            Nous serons heureux de vous accueillir. Réservez votre table en
            quelques secondes.
          </p>
          <a
            href={href}
            className="rs-btn rs-reservation__btn"
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            {label}
          </a>
        </div>
      </div>
    </section>
  );
}
