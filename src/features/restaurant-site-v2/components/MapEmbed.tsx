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
 * Embed Google Maps en iframe grayscale.
 *
 * Pourquoi iframe et pas Mapbox/leaflet :
 *  - Pas de clé API requise (Google Maps Embed URL est gratuit, public)
 *  - Pas de bundle JS supplémentaire
 *  - `filter: grayscale(1)` dans le CSS rend l'esthétique cohérente
 *    avec le design éditorial (réservé au filet bleu pour les routes)
 *
 * Format d'URL d'embed simple :
 *   https://www.google.com/maps?q=<adresse>&output=embed
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

  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <div className="rs2-map-wrap">
      <iframe
        src={embedSrc}
        title={`Carte ${address}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
