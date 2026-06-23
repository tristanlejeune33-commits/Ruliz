/* eslint-disable @next/next/no-img-element */

interface PhotoProps {
  /** URL image. `null`/`undefined`/vide → placeholder neutre (jamais de fausse photo). */
  src: string | null | undefined;
  alt: string;
  /** Mode de chargement — par défaut lazy sauf hero. */
  priority?: boolean;
  className?: string;
  /** Pour les Ken Burns / animations CSS internes au parent. */
  animateKenBurns?: boolean;
  /** Texte (initiales) affiché dans le placeholder quand pas d'image. */
  fallbackLabel?: string;
}

/**
 * Wrapper image simple — on n'utilise PAS next/image dans le template v2
 * parce que :
 *   - On veut le contrôle exact du object-fit (Ken Burns, etc.)
 *   - Les sources sont des URLs Unsplash en démo et R2 en prod, sans
 *     domaine fixé
 *   - L'overhead next/image est limité ici (les sections n'ont pas un
 *     LCP critique vu le scroll lazy)
 *
 * En prod, on peut wrapper next/image avec un loader R2 si nécessaire.
 */
export function Photo({
  src,
  alt,
  priority = false,
  className = "",
  animateKenBurns = false,
  fallbackLabel,
}: PhotoProps) {
  // Pas d'image → placeholder neutre (surface + initiales). On n'affiche
  // jamais une fausse photo de stock ni une image cassée.
  if (!src) {
    const initials = (fallbackLabel ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <div className={`rs2-photo-empty ${className}`.trim()} role="img" aria-label={alt}>
        {initials ? <span className="rs2-photo-empty-mark">{initials}</span> : null}
      </div>
    );
  }
  const cls = animateKenBurns ? `${className} rs2-photo-kb`.trim() : className;
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cls}
    />
  );
}
