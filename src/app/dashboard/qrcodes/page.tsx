import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ImageOff,
  Package,
  QrCode,
  ScanLine,
  Sparkles,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { listBoutiqueProduitsPublic } from "@/server/dashboard/boutique-queries";
import { QrcodesView } from "./qrcodes-view";

export const metadata: Metadata = {
  title: "QR codes · Ruliz",
};

export default async function QrcodesPage() {
  const { restaurant } = await getCurrentRestaurant();

  const [qrcodes, boutiqueProduits] = await Promise.all([
    prisma.qrcode.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
    }),
    listBoutiqueProduitsPublic(),
  ]);

  const totalScans = qrcodes.reduce((sum, q) => sum + Number(q.scanTotal), 0);
  const totalScansMois = qrcodes.reduce((sum, q) => sum + Number(q.scanMois), 0);
  const actifs = qrcodes.filter((q) => q.statut === "actif").length;

  return (
    <div className="space-y-8">
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

      {/* === CTA BRILLANT — BOUTIQUE QR CODE MADE IN FRANCE ===
          Bannière premium pleine largeur avec gradient drapeau tricolore,
          ombres, glow et badge animé. Conduit vers la boutique pour
          commander des supports physiques pré-imprimés. */}
      <Link
        href="/dashboard/boutique"
        className="group relative block overflow-hidden rounded-2xl"
      >
        {/* Background : gradient bleu → blanc → rouge (drapeau FR subtil) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, #0055A4 0%, #0055A4 25%, #ffffff 50%, #EF4135 75%, #EF4135 100%)",
            opacity: 0.92,
          }}
          aria-hidden
        />
        {/* Overlay sombre pour lisibilité du texte */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40"
          aria-hidden
        />
        {/* Effet shine animé qui passe au hover */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
            transform: "translateX(-100%)",
            animation: "none",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex-1">
            {/* Badge */}
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

            {/* Garanties / arguments */}
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

          {/* Bouton CTA glowing */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-xl bg-white blur-xl opacity-50 transition-opacity duration-300 group-hover:opacity-80"
              aria-hidden
            />
            <span className="relative inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#0055A4] shadow-2xl ring-1 ring-white/50 transition-transform duration-200 group-hover:scale-105">
              Voir la boutique
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>

      {/* Mini-catalogue : 3 ou 6 produits, lien voir plus */}
      {boutiqueProduits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Aperçu du catalogue
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/boutique">
                Voir tout ({boutiqueProduits.length}) →
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boutiqueProduits.slice(0, 3).map((p) => (
              <BoutiqueProductTile key={p.id.toString()} produit={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Petite card produit pour le mini-catalogue dans /dashboard/qrcodes.
 * Version simplifiée de la carte boutique principale.
 */
function BoutiqueProductTile({
  produit,
}: {
  produit: {
    id: bigint;
    slug: string;
    nom: string;
    description: string | null;
    prixCentimes: number;
    devise: string;
    imageUrl: string | null;
    stockRestant: number | null;
  };
}) {
  const isOutOfStock = produit.stockRestant === 0;
  return (
    <Link
      href={`/dashboard/boutique/${produit.slug}`}
      className={`group ${isOutOfStock ? "pointer-events-none" : ""}`}
    >
      <Card
        className={`lift-hover relative overflow-hidden p-0 transition-all ${
          isOutOfStock ? "opacity-60" : ""
        }`}
      >
        {isOutOfStock && (
          <span className="absolute right-2 top-2 z-10 rounded-md border border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--neon-danger)]">
            Rupture
          </span>
        )}
        <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-glass-strong)]">
          {produit.imageUrl ? (
            <Image
              src={produit.imageUrl}
              alt={produit.nom}
              width={300}
              height={225}
              unoptimized
              className={`size-full object-cover transition-transform duration-300 ${
                isOutOfStock ? "grayscale" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageOff
                className="size-8 text-[var(--text-tertiary)]"
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {produit.nom}
          </h3>
          {produit.description && (
            <p className="line-clamp-1 text-[11px] text-[var(--text-tertiary)]">
              {produit.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {(produit.prixCentimes / 100).toLocaleString("fr-FR", {
                style: "currency",
                currency: produit.devise,
              })}
            </span>
            {!isOutOfStock && (
              <span className="text-[10px] text-[var(--neon-cyan)] opacity-0 transition-opacity group-hover:opacity-100">
                Commander →
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
