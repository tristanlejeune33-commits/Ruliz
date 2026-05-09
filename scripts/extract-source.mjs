// Extrait le vrai HTML d'une sauvegarde "view-source" de Chrome.
// Usage: node scripts/extract-source.mjs <input.html> <output.html>
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("Usage: node scripts/extract-source.mjs <input.html> <output.html>");
  process.exit(1);
}

const raw = readFileSync(input, "utf8");

// Chrome wraps each line in <td class="line-content">…</td>
const matches = [...raw.matchAll(/<td class="line-content"[^>]*>([\s\S]*?)<\/td>/g)];

const lines = matches.map((m) => {
  let line = m[1];
  // Strip span tags
  line = line.replace(/<\/?span[^>]*>/g, "");
  // <a>links replace by their href content (strip wrapping <a>)
  line = line.replace(/<a [^>]*>([^<]+)<\/a>/g, "$1");
  // <br> becomes empty
  line = line.replace(/<br\s*\/?>/g, "");
  // Decode HTML entities
  line = line
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return line;
});

writeFileSync(output, lines.join("\n"), "utf8");
console.log(`Wrote ${lines.length} lines to ${output}`);
