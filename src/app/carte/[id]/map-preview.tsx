"use client";

import { MapPin } from "lucide-react";
import type { CarteTheme } from "./theme";

interface MapPreviewProps {
  address: string;
  theme: CarteTheme;
  /** Label CTA, traduisible via i18n côté caller. */
  ctaLabel: string;
}

/**
 * Aperçu carte sur la page publique `/carte/[id]`.
 *
 * Pourquoi sur la carte publique :
 *   - Un client qui scanne le QR à table peut vouloir mémoriser l'adresse
 *     pour revenir, sans avoir à copier-coller
 *   - Tap → ouvre Google Maps app (iOS/Android) en mode itinéraire
 *
 * Stratégie technique :
 *   - iframe Google Maps Embed (zéro API key, gratuit, public)
 *   - `loading="lazy"` → l'iframe ne charge que si l'user scroll jusqu'au
 *     footer (la carte est en bas de page) → pas d'impact perf au 1er paint
 *   - filter grayscale + contrast pour cohérence visuelle avec le footer navy
 *   - CTA en superposition bas-droit : pill blanc qui ouvre Maps en
 *     `dir/?api=1&destination=` (mode itinéraire universel)
 */
export function MapPreview({ address, theme, ctaLabel }: MapPreviewProps) {
  if (!address || !address.trim()) return null;

  const encoded = encodeURIComponent(address);
  const embedSrc = `https://www.google.com/maps?q=${encoded}&output=embed`;
  const openMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  return (
    <div
      className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl"
      style={{
        aspectRatio: "16/10",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <iframe
        src={embedSrc}
        title={`Carte ${address}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="size-full"
        style={{
          border: 0,
          // Grayscale + contrast pour s'intégrer au footer navy plutôt que
          // dénoter avec un Maps full-colors saturé.
          filter: "grayscale(1) contrast(0.95) brightness(0.92)",
        }}
      />

      {/* CTA Ouvrir dans Maps — pill blanc bas-droit */}
      <a
        href={openMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide shadow-lg transition-transform hover:-translate-y-0.5"
        style={{
          backgroundColor: "white",
          color: theme.primary,
        }}
        aria-label="Ouvrir l'itinéraire dans Google Maps"
      >
        <MapPin className="size-3.5" strokeWidth={2.2} />
        <span>{ctaLabel}</span>
      </a>
    </div>
  );
}
