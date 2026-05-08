"use client";

/**
 * Placeholder élégant pour les plats sans photo : un dégradé chaleureux
 * (couleurs accent du resto) avec un grain SVG très subtil. Plus joli
 * qu'un carré gris vide.
 */
export function DishPlaceholder({
  accent,
  className,
}: {
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${hexWithAlpha(accent, 0.18)} 0%, ${hexWithAlpha(accent, 0.06)} 60%, transparent 100%), oklch(0.97 0.005 90)`,
        backgroundBlendMode: "multiply",
        position: "relative",
        overflow: "hidden",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-40 mix-blend-multiply"
      >
        <defs>
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix values="0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0.4 0" />
          </filter>
        </defs>
        <rect width="100" height="100" filter="url(#grain)" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute left-1/2 top-1/2 size-1/3 max-w-12 -translate-x-1/2 -translate-y-1/2 opacity-25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: accent }}
      >
        <path d="M3 11h18" />
        <path d="M12 11V3" />
        <path d="M5 21l1.5-7h11l1.5 7" />
        <circle cx="12" cy="6" r="2" />
      </svg>
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${m[1]}${a}`;
}
