import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Package,
  QrCode,
  ScanLine,
  Sparkles,
  Truck,
} from "lucide-react";
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
      {/* === CTA BRILLANT EN PREMIER — Boutique QR Made in France ===
          Vrai drapeau français (3 bandes nettes verticales bleu/blanc/rouge)
          en background, overlay dark pour lisibilité, contenu blanc en avant. */}
      <Link
        href="/dashboard/boutique"
        className="group relative block overflow-hidden rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.62)),
            linear-gradient(
              to right,
              #0055A4 0%, #0055A4 33.34%,
              #FFFFFF 33.34%, #FFFFFF 66.66%,
              #EF4135 66.66%, #EF4135 100%
            )
          `,
        }}
      >
        <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <Sparkles className="size-3" strokeWidth={2} />
              🇫🇷 Made in France
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Commande tes supports QR
              <span className="block bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent">
                imprimés en France 🥖
              </span>
            </h2>

            <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
              Sets de table, stickers vitrine, présentoirs, chevalets… ton QR
              code pré-imprimé sur du matériel pro, livré chez toi en 5 jours.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/95">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-3.5" strokeWidth={2} />
                Livraison 5 jours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" strokeWidth={2} />
                Pelliculage mat pro
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package className="size-3.5" strokeWidth={2} />
                Ton logo + couleurs
              </span>
            </div>
          </div>

          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-xl bg-white blur-xl opacity-50 transition-opacity duration-300 group-hover:opacity-80"
              aria-hidden
            />
            <span className="relative inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#0055A4] shadow-2xl ring-1 ring-white/50 transition-transform duration-200 group-hover:scale-105">
              Voir la boutique
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </Link>

      <PageHero
        accent="violet"
        eyebrow={
          <HeroEyebrow icon={<QrCode className="size-3" />}>
            QR codes
          </HeroEyebrow>
        }
        title="Tes QR codes"
        description="Génère et imprime un QR code par table, vitrine ou set de table. Un clic suffit pour démarrer."
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
