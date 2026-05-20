/* eslint-disable @next/next/no-img-element */

interface PhotoProps {
  src: string;
  alt: string;
  /** Mode de chargement — par défaut lazy sauf hero. */
  priority?: boolean;
  className?: string;
  /** Pour les Ken Burns / animations CSS internes au parent. */
  animateKenBurns?: boolean;
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
}: PhotoProps) {
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
