/**
 * Slugifier un nom de restaurant en URL-friendly.
 *
 * Règles :
 *  - lowercase
 *  - accents normalisés (é → e, ñ → n)
 *  - tout caractère non [a-z0-9] → tiret
 *  - tirets multiples collapsés
 *  - tronqué à 60 chars
 *  - tirets en début/fin retirés
 *
 * Exemples :
 *  "Le Tire-Bouchon"        → "le-tire-bouchon"
 *  "Café de la Paix #2"     → "cafe-de-la-paix-2"
 *  "  L'Atelier  Brunoise " → "l-atelier-brunoise"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/**
 * Validation côté serveur — un slug valide n'a que [a-z0-9-], pas plus de
 * 64 chars, pas vide, pas tirets en bord, pas double tiret.
 */
export function isValidSlug(s: string): boolean {
  if (!s || s.length < 2 || s.length > 64) return false;
  if (s.startsWith("-") || s.endsWith("-")) return false;
  if (s.includes("--")) return false;
  return /^[a-z0-9-]+$/.test(s);
}

/**
 * Liste de slugs réservés — ne peuvent pas être pris par les restaurateurs
 * (risque de collision avec routes système ou mots déposés).
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "dashboard",
  "api",
  "login",
  "signup",
  "logout",
  "pricing",
  "carte",
  "site",
  "preview",
  "ruliz",
  "support",
  "help",
  "contact",
  "legal",
  "blog",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
]);

export function isReservedSlug(s: string): boolean {
  return RESERVED_SLUGS.has(s.toLowerCase());
}
