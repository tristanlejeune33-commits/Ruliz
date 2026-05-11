import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Activity, ImageOff, Package, QrCode, ScanLine, ShoppingBag } from "lucide-react";
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

      {/* === SECTION BOUTIQUE QR — supports physiques commandables ===
          Fusionne l'ancienne page /dashboard/boutique ici pour offrir une
          expérience unifiée "gérer mes QR + commander des supports". */}
      {boutiqueProduits.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--neon-violet)]">
                <Package className="size-3" strokeWidth={1.75} />
                Boutique QR
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Commande tes supports physiques
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Sets de table, stickers vitrine, présentoirs A6, cartes
                imprimées : ton QR pré-imprimé, livré chez toi.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/boutique/panier">
                <ShoppingBag className="size-3.5" strokeWidth={1.75} />
                Voir mon panier
              </Link>
            </Button>
          </div>

          {/* Mini-catalogue — 3 ou 6 produits selon écran, le reste via lien */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boutiqueProduits.slice(0, 6).map((p) => (
              <BoutiqueProductTile key={p.id.toString()} produit={p} />
            ))}
          </div>

          {boutiqueProduits.length > 6 && (
            <div className="text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/boutique">
                  Voir les {boutiqueProduits.length - 6} autres produits →
                </Link>
              </Button>
            </div>
          )}
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
