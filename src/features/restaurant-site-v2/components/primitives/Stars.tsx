interface StarsProps {
  rating: number; // 1..5
}

/**
 * 5 étoiles, remplies à hauteur de `rating`. Couleur accent.
 * On utilise des caractères Unicode pour rester léger (pas de SVG).
 */
export function Stars({ rating }: StarsProps) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="rs2-stars" aria-label={`Note ${n} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden>
          {i < n ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}
