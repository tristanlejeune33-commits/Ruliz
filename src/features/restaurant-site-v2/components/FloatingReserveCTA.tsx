"use client";

import { useEffect, useState } from "react";

interface FloatingReserveCTAProps {
  /** URL externe TheFork/Zenchef. Si null → bouton caché entièrement. */
  reservationUrl: string | null;
  label?: string;
}

/**
 * CTA flottant "Réserver" en haut à droite (top-left mobile via CSS).
 *
 * Visible quand :
 *   - scrollY > 55% du viewport (= on a dépassé le hero, l'utilisateur a
 *     vu le pitch)
 *   - ET la section #book (Reservation) n'est pas dans le viewport
 *     (sinon redondance avec le CTA géant de la section)
 *
 * Disparaît avec une transition fluide opacity + translateY.
 */
export function FloatingReserveCTA({
  reservationUrl,
  label = "Réserver",
}: FloatingReserveCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!reservationUrl) return;
    function onScroll() {
      const past = window.scrollY > window.innerHeight * 0.55;
      const book = document.getElementById("book");
      let bookVisible = false;
      if (book) {
        const r = book.getBoundingClientRect();
        bookVisible =
          r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15;
      }
      setVisible(past && !bookVisible);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reservationUrl]);

  if (!reservationUrl) return null;

  return (
    <a
      href={reservationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`rs2-float-cta${visible ? " in" : ""}`}
      aria-label={`${label} (s'ouvre dans un nouvel onglet)`}
    >
      <span className="dot" aria-hidden />
      <span>{label}</span>
      <span aria-hidden>→</span>
    </a>
  );
}
