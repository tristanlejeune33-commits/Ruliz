interface MonogramProps {
  /** Nom du resto — on extrait les initiales (max 2 lettres). */
  name: string;
}

/**
 * Pastille d'initiales utilisée dans la navbar quand pas de logo image.
 * Italique display sur presets editorial/classic, sans-serif gras sur modern.
 */
export function Monogram({ name }: MonogramProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className="rs2-monogram">{initials || "·"}</div>;
}
