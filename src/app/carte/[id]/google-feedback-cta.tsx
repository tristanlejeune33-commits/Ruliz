"use client";

import { Gift } from "lucide-react";
import type { CarteTheme } from "./theme";

interface GoogleFeedbackCTAProps {
  /** Texte d'accroche, ex: "Donnez votre avis sur Google ou abonnez-vous à nos réseaux pour tenter de gagner !" */
  description: string;
  /** Texte du bouton, ex: "Tourner la roue" */
  buttonLabel: string;
  /** Titre de la box, ex: "Jeu Concours 🎉" */
  title?: string;
  onSpinClick: () => void;
  theme: CarteTheme;
}

/**
 * Box "Jeu Concours" qui apparaît avant le footer si un jeu actif existe.
 * Click → ouvre la modal roulette.
 *
 * Réplique de l'ancien `<section id="google-feedback">`.
 */
export function GoogleFeedbackCTA({
  description,
  buttonLabel,
  title = "Jeu Concours 🎉",
  onSpinClick,
  theme,
}: GoogleFeedbackCTAProps) {
  return (
    <section
      id="google-feedback"
      className="mx-auto mt-[30px] w-[92%] overflow-hidden rounded-[10px] md:max-w-[640px] lg:mt-16 lg:max-w-[720px]"
      style={{
        backgroundColor: theme.cardBody,
        boxShadow: theme.shadow,
      }}
    >
      <div className="p-[15px] md:p-5 lg:p-6">
        <h3
          className="text-[20px] font-semibold lg:text-[22px]"
          style={{
            color: theme.textBody,
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </h3>
        <p
          className="mt-0.5 text-sm font-light lg:text-[15px]"
          style={{
            color: theme.textBody,
            fontFamily: "var(--font-body)",
            opacity: 0.85,
          }}
        >
          {description}
        </p>
        <button
          type="button"
          onClick={onSpinClick}
          className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 text-center text-base font-semibold transition-opacity hover:opacity-90 lg:mt-4 lg:h-12 lg:text-[17px]"
          style={{
            backgroundColor: theme.primary,
            color: theme.textOnPrimary,
            fontFamily: "var(--font-body)",
          }}
        >
          <Gift className="size-5" aria-hidden />
          <span>{buttonLabel}</span>
        </button>
      </div>
    </section>
  );
}
