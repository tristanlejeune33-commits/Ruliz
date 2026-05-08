import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="secondary">
          <QrCode className="size-3" /> {qrcodes.length} QR code{qrcodes.length > 1 ? "s" : ""}
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">QR codes</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Génère et imprime un QR code par table, vitrine ou set de table.
        </p>
      </header>

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
