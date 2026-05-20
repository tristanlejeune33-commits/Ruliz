/**
 * Convertit une couleur hex (#RRGGBB) en valeur CSS oklch().
 *
 * Pourquoi ? Le système de couleur du template est en `oklch` (uniformité
 * perceptuelle). Mais l'utilisateur saisit son accent en hex dans le
 * dashboard. Cette fonction fait le pont.
 *
 * Si l'entrée est déjà un `oklch(...)` ou autre format CSS valide, on la
 * renvoie telle quelle.
 *
 * Algorithme : hex → sRGB → linear RGB → OKLab → OKLCH.
 * Référence : https://bottosson.github.io/posts/oklab/
 */

export function hexToOklch(input: string): string {
  // Passthrough si l'utilisateur a déjà fourni un format CSS oklch / hsl / rgb
  const trimmed = input.trim();
  if (/^oklch\s*\(/i.test(trimmed)) return trimmed;
  if (/^(hsl|rgb)a?\s*\(/i.test(trimmed)) return trimmed;

  // Parse #RRGGBB ou #RGB
  let hex = trimmed.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) {
    // Fallback safe — ne crashe pas si l'entrée est invalide
    return "oklch(0.4 0.12 22)";
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  // sRGB → linear
  const toLinear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rL = toLinear(r);
  const gL = toLinear(g);
  const bL = toLinear(b);

  // linear RGB → LMS (OKLab matrix)
  const l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
  const m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
  const s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

  // Cube root non-linearity
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS → OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bO = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab → OKLCH (polar)
  const C = Math.sqrt(a * a + bO * bO);
  let H = (Math.atan2(bO, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  // Format à 3 décimales pour C, entier pour H
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${Math.round(H)})`;
}
