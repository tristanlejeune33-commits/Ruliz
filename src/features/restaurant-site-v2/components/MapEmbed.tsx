interface MapEmbedProps {
  /**
   * URL Google Maps "share" classique. On extrait l'adresse depuis le
   * paramètre `?q=` ou on fallback sur l'URL elle-même pour générer
   * une URL d'embed iframe-compatible.
   */
  googleMapsUrl: string;
  /** Adresse texte (fallback si l'URL n'a pas de q=). */
  address: string;
}

/**
 * Embed Google Maps en iframe grayscale + CTA "Ouvrir dans Maps".
 *
 * Stratégie :
 *  - iframe `output=embed` Google Maps (zéro API key, gratuit)
 *  - filter CSS grayscale + contrast pour s'intégrer au design éditorial
 *  - CTA overlay en bas-droite : ouvre l'application Maps native sur
 *    mobile (iOS/Android) ou Google Maps dans un nouvel onglet sur
 *    desktop. Universal URL "google.com/maps/dir/?destination=..."
 *    fonctionne partout.
 *  - Click bloquant sur l'iframe désactivé via pointer-events absent :
 *    on garde l'iframe interactive (zoom/pan) pour ceux qui veulent
 *    regarder en place.
 */
export function MapEmbed({ googleMapsUrl, address }: MapEmbedProps) {
  // Tente d'extraire le paramètre ?q= de l'URL fournie
  let query = address;
  try {
    const url = new URL(googleMapsUrl);
    const q = url.searchParams.get("q");
    if (q) query = q;
  } catch {
    // URL invalide → on garde l'adresse texte
  }

  const encoded = encodeURIComponent(query);
  const embedSrc = `https://www.google.com/maps?q=${encoded}&output=embed`;
  // Universal Maps URL — ouvre Google Maps app sur mobile, web sinon.
  // Format "dir" pour proposer un itinéraire directement (UX > "search").
  const openInMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  return (
    <div className="rs2-map-wrap">
      <iframe
        src={embedSrc}
        title={`Carte ${address}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={openInMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rs2-map-cta"
        aria-label="Ouvrir l'itinéraire dans Google Maps"
      >
        <span className="rs2-map-cta-icon" aria-hidden>
          ➜
        </span>
        <span>Ouvrir dans Maps</span>
      </a>
    </div>
  );
}
