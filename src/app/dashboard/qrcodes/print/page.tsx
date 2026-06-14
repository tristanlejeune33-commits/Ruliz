import type { Metadata } from "next";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { serialize } from "@/lib/serialize";
import { QrcodesPrintView } from "./print-view";

export const metadata: Metadata = {
  title: "Imprimer mes QR codes",
};

/**
 * Page d'impression dédiée des QR codes. Ouverte dans un nouvel onglet depuis
 * la liste. Le rendu est pensé pour le papier (A4) : grille de QR avec leur
 * libellé, sans la chrome du dashboard (cf. print-view.tsx + @media print).
 */
export default async function QrcodesPrintPage() {
  const { restaurant } = await getCurrentRestaurant();
  await ensureRuntimeSchema();

  // Seuls les QR exploitables (actifs + générés) sont à imprimer.
  const qrcodes = await prisma.qrcode.findMany({
    where: { restaurantId: restaurant.id, statut: "actif", pngUrl: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <QrcodesPrintView
      restaurantName={restaurant.nom}
      qrcodes={serialize(qrcodes).map((q) => ({
        id: q.id,
        codeUnique: q.codeUnique,
        pngUrl: q.pngUrl,
        label: q.label,
      }))}
    />
  );
}
