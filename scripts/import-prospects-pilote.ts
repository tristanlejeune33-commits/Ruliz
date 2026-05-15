/**
 * Importe data/prospects-pilote-2000.csv → table prospect_restaurants.
 *
 * Idempotent : upsert par email. Si on relance, ça ne crée pas de doublons,
 * et ça met à jour les champs si tu as régénéré le CSV (mais seulement
 * pour les prospects encore en statut "queued").
 *
 * Usage : pnpm tsx scripts/import-prospects-pilote.ts
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

const CAMPAIGN_SOURCE = "pilote-2k-2026-05";
const CSV_PATH = path.join(process.cwd(), "data", "prospects-pilote-2000.csv");

/** Parser CSV simple (gère les guillemets doubles avec échappement RFC 4180). */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const header = lines[0];
  if (!header) return [];

  const headers = splitLine(header);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = splitLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j] ?? "";
      row[key] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch ?? "";
    }
  }
  result.push(current);
  return result;
}

function s(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  console.log("[outreach-import] Ensuring schema…");
  await ensureRuntimeSchema();

  console.log(`[outreach-import] Reading ${CSV_PATH}…`);
  const content = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(content);
  console.log(`[outreach-import] → ${rows.length} rows`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) {
      skipped++;
      continue;
    }
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }

    const data = {
      source: CAMPAIGN_SOURCE,
      email,
      nom: s(r.nom) ?? email,
      ville: s(r.ville),
      codePostal: s(r.code_postal),
      adresse: s(r.adresse),
      telephone: s(r.telephone),
      siteWeb: s(r.site_web),
      logoUrl: s(r.logo_url),
      photoCover: s(r.photo_cover),
      rating: r.rating ? parseFloat(r.rating) : null,
      nbReviews: r.nb_reviews ? parseInt(r.nb_reviews, 10) : null,
      niveauPrix: s(r.niveau_prix),
      status: "queued",
    };

    try {
      const existing = await prisma.prospectRestaurant.findUnique({
        where: { email },
        select: { id: true, status: true },
      });

      if (!existing) {
        await prisma.prospectRestaurant.create({ data });
        inserted++;
      } else if (existing.status === "queued") {
        await prisma.prospectRestaurant.update({
          where: { email },
          data,
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[outreach-import] Failed for ${email}:`, err);
      skipped++;
    }

    if ((i + 1) % 100 === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `[outreach-import] Progress: ${i + 1}/${rows.length} (${inserted}+${updated} OK, ${skipped} skip) — ${elapsed}s`,
      );
    }
  }

  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n[outreach-import] ✅ Done in ${totalElapsed}s`);
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Updated  : ${updated}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Total    : ${rows.length}`);

  const dbCount = await prisma.prospectRestaurant.count({
    where: { source: CAMPAIGN_SOURCE },
  });
  console.log(`\n[outreach-import] DB count for "${CAMPAIGN_SOURCE}": ${dbCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
