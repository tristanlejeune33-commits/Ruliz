/**
 * Exporte le CSV prêt pour upload Smartlead.ai.
 *
 * Ne sélectionne que les prospects en statut "generated" (carte prête,
 * cardToken assigné). Inclut l'URL preview personnalisée.
 *
 * Sortie : data/smartlead-pilote-2k.csv
 *
 * Usage : pnpm tsx scripts/export-prospects-for-smartlead.ts
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

const CAMPAIGN = "pilote-2k-2026-05";
const OUTPUT = path.join(process.cwd(), "data", "smartlead-pilote-2k.csv");
const PREVIEW_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function firstNameFromEmail(email: string): string {
  // marie@bistro.fr → "Marie"
  const local = email.split("@")[0] ?? "";
  const candidate = local
    .replace(/[._-]/g, " ")
    .replace(/\d+/g, "")
    .split(" ")[0]
    ?.trim();
  if (!candidate || candidate.length < 2) return "bonjour";
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

async function main() {
  console.log("[smartlead-export] Ensuring schema…");
  await ensureRuntimeSchema();

  console.log("[smartlead-export] Loading generated prospects…");
  const prospects = await prisma.prospectRestaurant.findMany({
    where: {
      source: CAMPAIGN,
      status: "generated",
      cardToken: { not: null },
    },
    select: {
      email: true,
      nom: true,
      ville: true,
      cardToken: true,
    },
    orderBy: { rating: "desc" },
  });

  console.log(`[smartlead-export] ${prospects.length} prospects ready`);

  if (prospects.length === 0) {
    console.log("[smartlead-export] ⚠️  No generated prospects. Run the enrich + generate pipeline first.");
    return;
  }

  const headers = [
    "email",
    "nom",
    "ville",
    "first_name",
    "preview_url",
  ];

  const lines = [headers.join(",")];
  for (const p of prospects) {
    const row = {
      email: p.email,
      nom: p.nom,
      ville: p.ville ?? "",
      first_name: firstNameFromEmail(p.email),
      preview_url: `${PREVIEW_BASE_URL}/preview/${p.cardToken}`,
    };
    lines.push(headers.map((h) => csvEscape(row[h as keyof typeof row])).join(","));
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, lines.join("\n"), "utf8");

  console.log(`\n[smartlead-export] ✅ Written: ${OUTPUT}`);
  console.log(`   ${prospects.length} prospects (${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB)`);
  console.log("\n[smartlead-export] Next steps:");
  console.log("   1. Upload data/smartlead-pilote-2k.csv → Smartlead.ai");
  console.log("   2. Map custom fields: nom, ville, first_name, preview_url");
  console.log("   3. Configure sequence with 4 steps (J+0, J+3, J+7, J+14)");
  console.log("   4. Pull variants HTML from /admin/outreach/variants");
  console.log("   5. Start drip 200/day to warm up domain");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
