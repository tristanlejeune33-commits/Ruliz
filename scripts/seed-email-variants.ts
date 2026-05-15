/**
 * Seed les 12 variants d'emails (3 × 4 steps) dans email_variants pour la
 * campagne pilote-2k-2026-05.
 *
 * Idempotent : upsert par (campaign, step, variant).
 *
 * Usage : pnpm tsx scripts/seed-email-variants.ts
 */

import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { seedEmailVariants } from "@/server/outreach/email-variants-seed";
import { prisma } from "@/lib/db";

async function main() {
  console.log("[seed-variants] Ensuring schema…");
  await ensureRuntimeSchema();

  console.log("[seed-variants] Seeding 12 email variants…");
  const result = await seedEmailVariants();
  console.log("[seed-variants] ✅ Done");
  console.log(`  Inserted: ${result.inserted}`);
  console.log(`  Updated:  ${result.updated}`);

  const all = await prisma.emailVariant.findMany({
    where: { campaign: "pilote-2k-2026-05" },
    orderBy: [{ step: "asc" }, { variant: "asc" }],
    select: { step: true, variant: true, subject: true },
  });

  console.log("\n[seed-variants] All variants in DB:");
  for (const v of all) {
    console.log(`  Step ${v.step} variant ${v.variant} → ${v.subject}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
