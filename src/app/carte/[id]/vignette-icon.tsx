"use client";

import {
  Flame,
  Leaf,
  Heart,
  Home,
  Sprout,
  WheatOff,
  Drumstick,
  Sparkles,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapping codes vignettes (côté DB) → icône Lucide + couleur.
 *
 * Les codes courants Ruliz :
 *  - "vege" / "vegetarien" → Sprout vert
 *  - "vegan" → Leaf vert
 *  - "bio" → Leaf vert
 *  - "epic" / "epice" / "spicy" → Flame rouge
 *  - "sgluten" / "sansgluten" → WheatOff vert
 *  - "popu" / "populaire" → Heart rouge
 *  - "maison" / "home" → Home vert
 *  - "viande" → Drumstick
 *  - "nouveau" → Sparkles
 *  - "frais" / "froid" → Snowflake
 */
type VignetteVisual = { Icon: LucideIcon; color: string };

const VIGNETTE_MAP: Record<string, VignetteVisual> = {
  vege: { Icon: Sprout, color: "#16a34a" },
  vegetarien: { Icon: Sprout, color: "#16a34a" },
  vegan: { Icon: Leaf, color: "#16a34a" },
  bio: { Icon: Leaf, color: "#16a34a" },
  epic: { Icon: Flame, color: "#dc2626" },
  epice: { Icon: Flame, color: "#dc2626" },
  epicé: { Icon: Flame, color: "#dc2626" },
  spicy: { Icon: Flame, color: "#dc2626" },
  sgluten: { Icon: WheatOff, color: "#16a34a" },
  sansgluten: { Icon: WheatOff, color: "#16a34a" },
  popu: { Icon: Heart, color: "#dc2626" },
  populaire: { Icon: Heart, color: "#dc2626" },
  maison: { Icon: Home, color: "#16a34a" },
  home: { Icon: Home, color: "#16a34a" },
  viande: { Icon: Drumstick, color: "#a16207" },
  nouveau: { Icon: Sparkles, color: "#dc2626" },
  frais: { Icon: Snowflake, color: "#0284c7" },
  froid: { Icon: Snowflake, color: "#0284c7" },
};

interface VignetteIconProps {
  code: string;
  size?: number;
  className?: string;
  /**
   * Enrobe l'icône dans une bulle blanche circulaire avec ombre légère.
   * Indispensable quand l'icône est rendue directement sur le fond du resto
   * (qui peut être sombre, coloré ou photo) · sans la bulle, l'icône
   * disparaît visuellement.
   *
   * Mettre à `false` UNIQUEMENT quand l'icône est déjà dans un container
   * avec son propre fond (ex: pill `theme.cardBody` dans la modal détail).
   *
   * Default: `true` (cohérent avec le besoin universel de lisibilité).
   */
  wrapped?: boolean;
}

export function VignetteIcon({
  code,
  size = 18,
  className,
  wrapped = true,
}: VignetteIconProps) {
  const key = code.trim().toLowerCase();
  const visual = VIGNETTE_MAP[key];
  if (!visual) return null;
  const { Icon, color } = visual;

  if (!wrapped) {
    return (
      <Icon
        className={className}
        style={{ color, width: size, height: size }}
        aria-hidden
      />
    );
  }

  // Bulle blanche : padding ~22% de la taille pour un cercle propre, ombre
  // discrète pour décoller du fond. Ratio 28/16 = 1.75 sur la cible Lucide.
  const wrapperSize = Math.round(size * 1.55);
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: wrapperSize,
        height: wrapperSize,
        borderRadius: "9999px",
        backgroundColor: "#ffffff",
        boxShadow:
          "0 1px 2px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <Icon style={{ color, width: size, height: size }} aria-hidden />
    </span>
  );
}

export function hasVignetteVisual(code: string): boolean {
  return code.trim().toLowerCase() in VIGNETTE_MAP;
}
