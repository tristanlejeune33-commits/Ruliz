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
import { Logo } from "@/components/shared/logo";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { serialize } from "@/lib/serialize";
import { QrcodesView } from "./qrcodes-view";

export const metadata: Metadata = {
  title: "QR codes Ruliz",
};

export default async function QrcodesPage() {
  const { restaurant } = await getCurrentRestaurant();
  // Garantit la colonne `label` (ajoutée à chaud) avant le findMany qui
  // l'inclut désormais dans son SELECT.
  await ensureRuntimeSchema();

  const qrcodes = await prisma.qrcode.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });

  const totalScans = qrcodes.reduce((sum, q) => sum + Number(q.scanTotal), 0);
  const totalScansMois = qrcodes.reduce((sum, q) => sum + Number(q.scanMois), 0);
  const actifs = qrcodes.filter((q) => q.statut === "actif").length;

  return (
    <div className="space-y-8">
      {/* === CTA BRILLANT Boutique QR Made in France ===
          Drapeau stylisé SVG : 3 bandes ondulées (wave effect) avec gradient
          vertical donnant un effet de relief, ombre portée entre bandes,
          highlight blanc au bord du blanc et shadow noir au bord du rouge
          pour un look pro de "soie qui flotte". */}
      <Link
        href="/dashboard/boutique"
        className="group relative block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10"
      >
        {/* SVG drapeau ondulé */}
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Drop shadow pour le relief général */}
            <filter
              id="flag-shadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
              <feOffset dx="0" dy="4" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient bleu (highlight haut → ombre bas) */}
            <linearGradient id="cta-bleu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A6FBC" />
              <stop offset="45%" stopColor="#0055A4" />
              <stop offset="100%" stopColor="#003C7A" />
            </linearGradient>
            {/* Gradient blanc (subtle pour ne pas faire plat) */}
            <linearGradient id="cta-blanc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FAFAFA" />
              <stop offset="100%" stopColor="#E0E0E0" />
            </linearGradient>
            {/* Gradient rouge */}
            <linearGradient id="cta-rouge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5C4F" />
              <stop offset="45%" stopColor="#EF4135" />
              <stop offset="100%" stopColor="#C8362C" />
            </linearGradient>
          </defs>

          {/* Bande BLEUE wave bleu/blanc descend de (410,0) à (420,400)
              avec CPs (460,100) et (360,280) */}
          <path
            d="M 0,0 L 410,0 C 460,100 360,280 420,400 L 0,400 Z"
            fill="url(#cta-bleu)"
            filter="url(#flag-shadow)"
          />
          {/* Bande BLANCHE bord gauche = même courbe que bord droit du
              bleu (matchent). Bord droit = REVERSE de la courbe blanc/rouge
              du rouge → CPs swapés (750,280) puis (850,100) pour remonter
              de (790,400) à (800,0). Sans ce swap, les courbes ne fittent
              pas et un trou apparaît visuellement entre blanc et rouge. */}
          <path
            d="M 410,0 C 460,100 360,280 420,400 L 790,400 C 750,280 850,100 800,0 Z"
            fill="url(#cta-blanc)"
            filter="url(#flag-shadow)"
          />
          {/* Bande ROUGE bord gauche descend de (800,0) à (790,400) avec
              CPs (850,100) et (750,280) */}
          <path
            d="M 800,0 C 850,100 750,280 790,400 L 1200,400 L 1200,0 Z"
            fill="url(#cta-rouge)"
            filter="url(#flag-shadow)"
          />

          {/* Reflets subtils sur les courbes */}
          <path
            d="M 410,0 C 460,100 360,280 420,400"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 800,0 C 850,100 750,280 790,400"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* Overlay dark pour la lisibilité du texte blanc */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/55 to-black/65"
          aria-hidden
        />

        {/* Liseré shimmer en haut */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          aria-hidden
        />
        {/* Liseré shimmer en bas */}
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          aria-hidden
        />

        <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex-1">
            {/* Logo Ruliz + badge Made in France sur la même ligne */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 p-1.5 ring-1 ring-white/30 backdrop-blur-sm">
                <Logo variant="mark" inverted className="size-7" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                <Sparkles className="size-3" strokeWidth={2} />
                🇫🇷 Made in France
              </div>
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
