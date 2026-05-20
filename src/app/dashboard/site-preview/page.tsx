import type { Metadata } from "next";
import { SitePreviewClient } from "./site-preview-client";

/**
 * Phase de validation — 3 démos hardcodées avec toggle.
 *
 * - Pas de cache : le restaurateur (ou Tristan) qui visite cette page
 *   doit voir l'état exact du code en cours.
 * - Cette route sera supprimée une fois le template validé et branché
 *   sur les vraies données Prisma via /site/[restaurantId].
 *
 * Pas de plan gate ici (volontairement) — c'est un terrain d'essai.
 * La phase Wire Prisma ajoutera la gate Pro/Premium côté /site/[id].
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Site Preview · v2",
  robots: { index: false, follow: false },
};

export default function SitePreviewPage() {
  return <SitePreviewClient />;
}
