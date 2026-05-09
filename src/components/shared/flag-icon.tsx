import { cn } from "@/lib/utils";
import { langCountryCode, type SupportedLang } from "@/lib/langs";

interface FlagIconProps {
  /** Code langue (fr/en/es/de/it/pt/zh). */
  lang: SupportedLang;
  /** Largeur en pixels (default 20). La hauteur est calculée en ratio 4:3. */
  width?: number;
  className?: string;
  /** Si true, ajoute un ring + ombre pour effet "pin". */
  rounded?: boolean;
}

/**
 * Drapeau de langue — image SVG hébergée par flagcdn.com (CDN public,
 * format `https://flagcdn.com/{country}.svg`). Aucune dépendance npm.
 *
 * Usage typique : `<FlagIcon lang="fr" />` (20×15px) dans un dropdown,
 * une chip de langue, un picker de traduction.
 *
 * On rend une `<img>` simple (pas next/image) pour éviter la conf
 * `images.remotePatterns` Next.js — les flags sont 1-2 KB chacun, le gain
 * de l'optimisation est négligeable.
 */
export function FlagIcon({
  lang,
  width = 20,
  className,
  rounded = false,
}: FlagIconProps) {
  const country = langCountryCode(lang);
  const height = Math.round(width * 0.75); // ratio 4:3

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`https://flagcdn.com/${country}.svg`}
      alt={`Drapeau ${lang.toUpperCase()}`}
      width={width}
      height={height}
      className={cn(
        "shrink-0 select-none object-cover",
        rounded
          ? "rounded-[3px] ring-1 ring-black/10 shadow-sm"
          : "rounded-[2px]",
        className,
      )}
      loading="lazy"
      decoding="async"
    />
  );
}
