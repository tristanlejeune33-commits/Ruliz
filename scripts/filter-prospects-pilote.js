/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Filtre les 20 084 restos bruts → 2 000 prospects qualifiés pour le pilote.
 *
 * Stratégie :
 *   1. Email présent et format valide
 *   2. Déduplication par email
 *   3. Site web "réel" (pas Facebook/Instagram/TripAdvisor)
 *   4. Rating >= 4.0
 *   5. Pondération géographique (max 280/ville pour éviter sur-concentration)
 *   6. Tri par rating × log(reviews) pour prioriser les "bons restos qui marchent"
 *
 * Sortie : prospects-pilote-2000.csv prêt à importer dans `prospect_restaurants`.
 *
 * Usage : node scripts/filter-prospects-pilote.js
 *   (depuis /tmp/xlsx-inspect avec xlsx installé, ou installer xlsx localement)
 */

const XLSX = require("xlsx");
const fs = require("node:fs");
const path = require("node:path");

const INPUT =
  "C:/Users/trist/OneDrive/Bureau/Ruliz/DATA EMAIL/DATA RESTAURANT/20000 restaurant base.xlsx";
const OUTPUT = path.join(__dirname, "..", "data", "prospects-pilote-2000.csv");
const REJECTS = path.join(__dirname, "..", "data", "prospects-pilote-rejects.csv");
const TARGET = 2000;
const MAX_PER_CITY = 280;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BAD_SITE_RE = /facebook\.com|fb\.com|instagram\.com|tripadvisor\./i;

function logoCandidate(siteWeb) {
  if (!siteWeb) return null;
  try {
    const u = new URL(siteWeb.startsWith("http") ? siteWeb : `https://${siteWeb}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return null;
  }
}

function score(row) {
  // Score = rating (0..5) × log10(reviews + 10) — pénalise pas les nouveaux
  // mais favorise ceux qui ont déjà de la traction.
  const r = parseFloat(row.rating) || 0;
  const reviews = parseInt(row.numberOfReviews, 10) || 0;
  return r * Math.log10(reviews + 10);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

console.log("Reading workbook…");
const wb = XLSX.readFile(INPUT);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
console.log(`  → ${data.length} rows`);

// ─── Étape 1 : normaliser + filtrer ─────────────────────────────────────────
console.log("\nFiltering…");
const stages = {
  total: data.length,
  emailMissing: 0,
  emailInvalid: 0,
  noWebsite: 0,
  badWebsite: 0,
  ratingLow: 0,
  ratingMissing: 0,
  cityMissing: 0,
};

const candidates = [];

for (const r of data) {
  const email = String(r.email || "").trim().toLowerCase();
  if (!email) {
    stages.emailMissing++;
    continue;
  }
  if (!EMAIL_RE.test(email)) {
    stages.emailInvalid++;
    continue;
  }

  const website = String(r.website || "").trim();
  if (!website) {
    stages.noWebsite++;
    continue;
  }
  if (BAD_SITE_RE.test(website)) {
    stages.badWebsite++;
    continue;
  }

  const rating = parseFloat(r.rating);
  if (!rating || isNaN(rating)) {
    stages.ratingMissing++;
    continue;
  }
  if (rating < 4.0) {
    stages.ratingLow++;
    continue;
  }

  const city = String(r["addressObj/city"] || "").trim();
  if (!city) {
    stages.cityMissing++;
    continue;
  }

  candidates.push({
    email,
    nom: String(r.localName || r.name || "").trim(),
    ville: city,
    code_postal: String(r["addressObj/postalcode"] || "").trim(),
    adresse: String(r["addressObj/street1"] || r.address || "").trim(),
    telephone: String(r.phone || "").trim(),
    site_web: website,
    logo_url: logoCandidate(website),
    photo_cover: String(r["photos/0"] || "").trim(),
    rating,
    nb_reviews: parseInt(r.numberOfReviews, 10) || 0,
    niveau_prix: String(r.priceLevel || "").trim(),
    score: score(r),
  });
}

console.log(`  → ${candidates.length} candidates after basic filters`);
console.log("  Rejected:", JSON.stringify(stages, null, 2));

// ─── Étape 2 : déduplication email (garde le meilleur score par email) ──────
const byEmail = new Map();
for (const c of candidates) {
  const existing = byEmail.get(c.email);
  if (!existing || c.score > existing.score) byEmail.set(c.email, c);
}
const dedup = [...byEmail.values()];
console.log(`\nDedup: ${candidates.length} → ${dedup.length} (${candidates.length - dedup.length} duplicates removed)`);

// ─── Étape 3 : tri par score descendant ─────────────────────────────────────
dedup.sort((a, b) => b.score - a.score);

// ─── Étape 4 : pondération géographique ─────────────────────────────────────
console.log(`\nApplying city cap (max ${MAX_PER_CITY}/ville, target ${TARGET})…`);
const selected = [];
const cityCounts = new Map();
const rejects = [];

for (const c of dedup) {
  if (selected.length >= TARGET) break;
  const count = cityCounts.get(c.ville) ?? 0;
  if (count >= MAX_PER_CITY) {
    rejects.push({ ...c, reason: "city_cap" });
    continue;
  }
  selected.push(c);
  cityCounts.set(c.ville, count + 1);
}

console.log(`  → Selected ${selected.length} prospects`);
console.log("  Top 10 villes sélectionnées:");
const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [city, n] of topCities) {
  console.log(`    ${city.padEnd(28)} ${n}`);
}

// ─── Étape 5 : export CSV ───────────────────────────────────────────────────
const headers = [
  "email",
  "nom",
  "ville",
  "code_postal",
  "adresse",
  "telephone",
  "site_web",
  "logo_url",
  "photo_cover",
  "rating",
  "nb_reviews",
  "niveau_prix",
  "score",
];

writeCsv(OUTPUT, headers, selected);
console.log(`\n✅ Written: ${OUTPUT}`);
console.log(`   (${selected.length} prospects, ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB)`);

writeCsv(REJECTS, [...headers, "reason"], rejects.slice(0, 5000));
console.log(`📁 Rejects: ${REJECTS} (${rejects.length} total, top 5000 saved)`);

// ─── Stats finales ──────────────────────────────────────────────────────────
const avgRating = selected.reduce((s, c) => s + c.rating, 0) / selected.length;
const avgReviews = selected.reduce((s, c) => s + c.nb_reviews, 0) / selected.length;
const withPhoto = selected.filter((c) => c.photo_cover).length;
const withPhone = selected.filter((c) => c.telephone).length;
const withPriceLevel = selected.filter((c) => c.niveau_prix).length;

console.log("\n=== Profil de la cohorte 2000 ===");
console.log(`  Rating moyen      : ${avgRating.toFixed(2)}`);
console.log(`  Reviews moyen     : ${avgReviews.toFixed(0)}`);
console.log(`  Avec photo cover  : ${withPhoto} (${((withPhoto / selected.length) * 100).toFixed(1)}%)`);
console.log(`  Avec téléphone    : ${withPhone} (${((withPhone / selected.length) * 100).toFixed(1)}%)`);
console.log(`  Avec niveau prix  : ${withPriceLevel} (${((withPriceLevel / selected.length) * 100).toFixed(1)}%)`);
console.log(`  Nb villes uniques : ${cityCounts.size}`);
