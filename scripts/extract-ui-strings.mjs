/**
 * Extraction statique des chaînes UI françaises du panel.
 *
 * But : produire un CATALOGUE complet de tous les textes visibles du code
 * (texte JSX, props de texte, toasts) pour pouvoir les pré-traduire dans les
 * 7 langues EN UNE FOIS — sans avoir à naviguer manuellement dans toutes les
 * pages pour « réchauffer » le cache.
 *
 * Les chaînes extraites doivent correspondre EXACTEMENT au `nodeValue.trim()`
 * des text nodes que l'AutoTranslateWrapper rencontre à l'exécution, sinon la
 * traduction pré-calculée ne sera jamais retrouvée. On normalise donc le texte
 * JSX comme le fait React (lignes trim + jointes par espace).
 *
 * Sortie : src/lib/panel-strings-catalog.generated.ts (export const PANEL_STRINGS).
 *
 * Usage : node scripts/extract-ui-strings.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(SRC, "lib", "panel-strings-catalog.generated.ts");

// Dossiers à ignorer (carte publique = traduite côté serveur, pas via le
// wrapper ; site v2 = idem ; fichiers générés).
const IGNORE_DIRS = new Set(["node_modules", ".next", "generated"]);
// On cible le panel : admin + dashboard + composants partagés + features
// éditeur. La carte publique et le site vitrine ont leur propre i18n serveur.
const INCLUDE_PREFIXES = [
  path.join(SRC, "app", "admin"),
  path.join(SRC, "app", "dashboard"),
  path.join(SRC, "app", "(auth)"),
  path.join(SRC, "components"),
  path.join(SRC, "features"),
];
const EXCLUDE_PREFIXES = [
  path.join(SRC, "features", "restaurant-site-v2"),
  path.join(SRC, "app", "carte"),
  path.join(SRC, "app", "site"),
];

// Props string-literal dont la valeur devient du texte visible à l'écran.
const TEXT_ATTRS = new Set([
  "title",
  "label",
  "description",
  "heading",
  "subtitle",
  "eyebrow",
  "cta",
  "ctaLabel",
  "placeholder",
  "tooltip",
  "hint",
  "emptyLabel",
  "emptyTitle",
  "emptyDescription",
  "message",
]);

// Méthodes toast.* dont le 1er argument string est affiché (texte dans la
// Toaster, sous <body> → scanné par le wrapper).
const TOAST_METHODS = new Set([
  "success",
  "error",
  "message",
  "loading",
  "info",
  "warning",
]);

/** Liste récursive des fichiers .ts/.tsx sous les préfixes inclus. */
function walk(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      if (EXCLUDE_PREFIXES.some((p) => full === p || full.startsWith(p + path.sep)))
        continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const NAMED_ENTITIES = {
  "&nbsp;": " ",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&times;": "×",
  "&laquo;": "«",
  "&raquo;": "»",
  "&eacute;": "é",
  "&egrave;": "è",
  "&agrave;": "à",
  "&ccedil;": "ç",
  "&deg;": "°",
  "&euro;": "€",
};

/**
 * Décode les entités HTML d'un texte JSX → ce que React rend réellement à
 * l'écran. INDISPENSABLE pour que la clé du catalogue corresponde au
 * `nodeValue` runtime (ex: `c&apos;est` → `c'est`). `&amp;` décodé en dernier
 * pour éviter un double-décodage.
 */
function decodeEntities(s) {
  let out = s
    // numériques décimales et hexadécimales
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  for (const [ent, ch] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(ent).join(ch);
  }
  return out.split("&amp;").join("&");
}

/**
 * Normalise un texte JSX comme React : chaque ligne trim, lignes vides
 * supprimées, jointes par un espace, puis décodage des entités HTML. Pour un
 * texte mono-ligne, simple trim (les espaces internes sont préservés).
 */
function normalizeJsxText(raw) {
  const joined = raw.includes("\n")
    ? raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
    : raw;
  return decodeEntities(joined).trim();
}

/** Décide si une chaîne candidate est une vraie chaîne UI à traduire. */
function isCandidate(s) {
  if (!s) return false;
  if (s.length < 2 || s.length > 240) return false;
  // Doit contenir une lettre (latin + accents)
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  // URL / chemin / email
  if (/^https?:\/\//i.test(s) || s.includes("://")) return false;
  if (/^[/@#.]/.test(s)) return false;
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(s)) return false;
  // Pur nombre / symboles (même filtre que le wrapper runtime)
  if (/^[\d\s.,€$%/+\-*()[\]{}|]+$/.test(s)) return false;
  // Identifiant / className / icône : un seul "mot" en kebab/snake/camel sans espace
  if (!/\s/.test(s) && /^[a-z][a-z0-9]*([_-][a-z0-9]+)+$/.test(s)) return false;
  // Contient des accolades de template JSX résiduelles
  if (s.includes("{") || s.includes("}")) return false;
  // Variable d'interpolation type ${...} mal capturée
  if (s.includes("${")) return false;
  return true;
}

/** Extrait les candidats d'un fichier source. */
function extractFromFile(file, out) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    // 1) Texte JSX brut
    if (ts.isJsxText(node)) {
      const norm = normalizeJsxText(node.text);
      if (isCandidate(norm)) out.add(norm);
    }

    // 2) Attributs JSX de texte avec valeur string-literal
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf);
      if (TEXT_ATTRS.has(name)) {
        let lit = null;
        if (ts.isStringLiteral(node.initializer)) {
          lit = node.initializer.text;
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteral(node.initializer.expression)
        ) {
          lit = node.initializer.expression.text;
        }
        if (lit) {
          const norm = lit.trim();
          if (isCandidate(norm)) out.add(norm);
        }
      }
    }

    // 3) toast.xxx("...") — 1er argument string-literal
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sf) === "toast" &&
      TOAST_METHODS.has(node.expression.name.getText(sf))
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        const norm = arg.text.trim();
        if (isCandidate(norm)) out.add(norm);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
}

function main() {
  const files = [];
  for (const prefix of INCLUDE_PREFIXES) walk(prefix, files);

  const set = new Set();
  for (const f of files) {
    try {
      extractFromFile(f, set);
    } catch (err) {
      console.warn(`[extract] skip ${f}:`, err.message);
    }
  }

  const list = [...set].sort((a, b) => a.localeCompare(b, "fr"));

  const header = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : scripts/extract-ui-strings.mjs (node scripts/extract-ui-strings.mjs)
//
// Catalogue de toutes les chaînes UI françaises du panel, extraites
// statiquement (texte JSX, props de texte, toasts). Utilisé par l'action admin
// « Pré-traduire tout » pour remplir le cache des 7 langues en une fois, sans
// avoir à naviguer manuellement dans chaque page.
//
// ${list.length} chaînes.
`;

  const body = `export const PANEL_STRINGS: readonly string[] = [\n${list
    .map((s) => `  ${JSON.stringify(s)},`)
    .join("\n")}\n];\n`;

  fs.writeFileSync(OUT, header + "\n" + body, "utf8");
  console.log(`[extract] ${list.length} chaînes → ${path.relative(ROOT, OUT)}`);
}

main();
