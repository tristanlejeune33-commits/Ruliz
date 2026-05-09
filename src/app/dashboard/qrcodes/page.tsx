import type { Metadata } from "next";
import { Activity, QrCode, ScanLine } from "lucide-react";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { QrcodesView } from "./qrcodes-view";

export const metadata: Metadata = {
  title: "QR codes · Ruliz",
};

export default async function QrcodesPage() {
  const { restaurant } = await getCurrentRestaurant();

  const qrcodes = await prisma.qrcode.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });

  const totalScans = qrcodes.reduce((sum, q) => sum + Number(q.scanTotal), 0);
  const totalScansMois = qrcodes.reduce((sum, q) => sum + Number(q.scanMois), 0);
  const actifs = qrcodes.filter((q) => q.statut === "actif").length;

  return (
    <div className="space-y-8">
      <PageHero
        accent="qrcodes"
        eyebrow={
          <HeroEyebrow icon={<QrCode className="size-3" />}>
            QR codes
          </HeroEyebrow>
        }
        title="Tes QR codes"
        description="Génère et imprime un QR code par table, vitrine ou set de table — un clic suffit pour démarrer."
        kpis={
          <>
            <HeroKpi
              label="Actifs"
              value={
                <span className="tabular-nums">
                  {actifs}
                  <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    / {qrcodes.length}
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="Scans ce mois"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="size-3.5 text-[var(--accent)]" />
                  <span className="tabular-nums">
                    {totalScansMois.toLocaleString("fr-FR")}
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="Total"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ScanLine className="size-3.5 text-[var(--text-muted)]" />
                  <span className="tabular-nums">
                    {totalScans.toLocaleString("fr-FR")}
                  </span>
                </span>
              }
            />
          </>
        }
      />

      <QrcodesView
        restaurantId={restaurant.id.toString()}
        qrcodes={serialize(
          qrcodes.map((q) => ({
            ...q,
            scanTotal: Number(q.scanTotal),
            scanMois: Number(q.scanMois),
          })),
        )}
      />
    </div>
  );
}
