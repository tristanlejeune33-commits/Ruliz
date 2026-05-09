import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HeroEyebrow,
  PageHero,
} from "@/components/shared/page-hero";
import { listBoutiqueProduitsPublic } from "@/server/dashboard/boutique-queries";

export const metadata: Metadata = {
  title: "Boutique QR · Ruliz",
};

export default async function BoutiquePage() {
  const produits = await listBoutiqueProduitsPublic();

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
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/boutique/commandes">
              <ShoppingBag className="size-3.5" strokeWidth={1.75} />
              Mes commandes
            </Link>
          </Button>
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
            Reviens bientôt — de nouveaux supports arrivent.
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
  };
}

function ProduitCard({ produit }: ProduitCardProps) {
  return (
    <Link
      href={`/dashboard/boutique/${produit.slug}`}
      className="group"
    >
      <Card className="lift-hover overflow-hidden p-0 transition-all">
        <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-glass-strong)]">
          {produit.imageUrl ? (
            <Image
              src={produit.imageUrl}
              alt={produit.nom}
              width={400}
              height={300}
              unoptimized
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              Voir →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
