import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Package, ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HeroEyebrow,
  PageHero,
} from "@/components/shared/page-hero";
import { cartCount } from "@/lib/boutique-cart";
import {
  getHydratedCart,
  listBoutiqueProduitsPublic,
} from "@/server/dashboard/boutique-queries";

export const metadata: Metadata = {
  title: "Boutique QR · Ruliz",
};

export default async function BoutiquePage() {
  const [produits, cart] = await Promise.all([
    listBoutiqueProduitsPublic(),
    getHydratedCart(),
  ]);
  const cartTotal = cartCount(
    cart.map((c) => ({ produitId: c.produitId, quantite: c.quantite })),
  );

  // Group by categorie pour un meilleur catalogue
  const groupedByCat = produits.reduce<
    Record<string, typeof produits>
  >((acc, p) => {
    const cat = p.categorie ?? "Autres";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <PageHero
        accent="violet"
        eyebrow={
          <HeroEyebrow
            tone="violet"
            icon={<Package className="size-3" strokeWidth={1.75} />}
          >
            Boutique QR
          </HeroEyebrow>
        }
        title="Commande tes supports physiques"
        description="Sets de table imprimés, stickers QR, présentoirs, supports vitrine. Ton QR code unique pré-imprimé, livré chez toi."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/boutique/commandes">
                <ShoppingBag className="size-3.5" strokeWidth={1.75} />
                Mes commandes
              </Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="relative">
              <Link href="/dashboard/boutique/panier">
                <ShoppingCart className="size-3.5" strokeWidth={1.75} />
                Mon panier
                {cartTotal > 0 && (
                  <span className="ml-1 rounded-md bg-white/20 px-1.5 py-0 font-mono text-[10px] font-bold tabular-nums">
                    {cartTotal}
                  </span>
                )}
              </Link>
            </Button>
          </>
        }
      />

      {produits.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Package
            className="size-10 text-[var(--text-tertiary)]"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            La boutique est vide pour l&apos;instant
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Reviens bientôt · de nouveaux supports arrivent.
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedByCat).map(([cat, list]) => (
            <section key={cat} className="space-y-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {cat}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <ProduitCard key={p.id.toString()} produit={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProduitCardProps {
  produit: {
    id: bigint;
    slug: string;
    nom: string;
    description: string | null;
    prixCentimes: number;
    devise: string;
    imageUrl: string | null;
    stockMax: number | null;
    stockUtilise?: number;
    stockRestant?: number | null;
  };
}

function ProduitCard({ produit }: ProduitCardProps) {
  // Stock state : null = illimité, 0 = rupture, >0 = restant
  const stockRestant = produit.stockRestant;
  const isOutOfStock = stockRestant === 0;
  const isLowStock =
    stockRestant !== null &&
    stockRestant !== undefined &&
    stockRestant > 0 &&
    stockRestant <= 10;

  return (
    <Link
      href={`/dashboard/boutique/${produit.slug}`}
      className={`group ${isOutOfStock ? "pointer-events-none" : ""}`}
      aria-disabled={isOutOfStock}
    >
      <Card
        className={`lift-hover relative overflow-hidden p-0 transition-all ${
          isOutOfStock ? "opacity-60" : ""
        }`}
      >
        {/* Badge stock · top right */}
        {isOutOfStock && (
          <span className="absolute right-2 top-2 z-10 rounded-md border border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--neon-danger)]">
            Rupture
          </span>
        )}
        {!isOutOfStock && isLowStock && (
          <span className="absolute right-2 top-2 z-10 rounded-md border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-[var(--neon-violet)]">
            Plus que {stockRestant}
          </span>
        )}

        <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-glass-strong)]">
          {produit.imageUrl ? (
            <Image
              src={produit.imageUrl}
              alt={produit.nom}
              width={400}
              height={300}
              unoptimized
              className={`size-full object-cover transition-transform duration-300 ${
                isOutOfStock ? "grayscale" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageOff
                className="size-10 text-[var(--text-tertiary)]"
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-semibold tracking-tight text-[var(--text-primary)]">
            {produit.nom}
          </h3>
          {produit.description && (
            <p className="line-clamp-2 text-xs text-[var(--text-tertiary)]">
              {produit.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
              {(produit.prixCentimes / 100).toLocaleString("fr-FR", {
                style: "currency",
                currency: produit.devise,
              })}
            </span>
            <span className="text-xs text-[var(--neon-cyan)] opacity-0 transition-opacity group-hover:opacity-100">
              {isOutOfStock ? "Indisponible" : "Voir →"}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
