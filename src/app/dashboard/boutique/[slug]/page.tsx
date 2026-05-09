import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serialize } from "@/lib/serialize";
import { getBoutiqueProduitBySlug } from "@/server/dashboard/boutique-queries";
import { AddToCartButton } from "./add-to-cart-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const produit = await getBoutiqueProduitBySlug(slug);
  return { title: `${produit?.nom ?? "Produit"} · Boutique Ruliz` };
}

export default async function BoutiqueProduitPage({ params }: PageProps) {
  const { slug } = await params;
  const produit = await getBoutiqueProduitBySlug(slug);
  if (!produit) notFound();

  const features = Array.isArray(produit.featuresJson)
    ? produit.featuresJson.filter((x): x is string => typeof x === "string")
    : [];

  const serialized = serialize(produit);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/boutique">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Boutique
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <Card className="overflow-hidden p-0">
          <div className="aspect-square bg-[var(--bg-glass-strong)]">
            {produit.imageUrl ? (
              <Image
                src={produit.imageUrl}
                alt={produit.nom}
                width={800}
                height={800}
                unoptimized
                className="size-full object-cover"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageOff
                  className="size-16 text-[var(--text-tertiary)]"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Détails */}
        <div className="space-y-6">
          <div className="space-y-3">
            {produit.categorie && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--neon-violet)]">
                {produit.categorie}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {produit.nom}
            </h1>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {(produit.prixCentimes / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: produit.devise,
                })}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">HT / unité</span>
            </div>
          </div>

          {produit.description && (
            <p className="text-pretty text-sm text-[var(--text-secondary)]">
              {produit.description}
            </p>
          )}

          {features.length > 0 && (
            <ul className="space-y-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-[var(--text-primary)]"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-[var(--neon-success)]"
                    strokeWidth={2}
                  />
                  {f}
                </li>
              ))}
            </ul>
          )}

          <AddToCartButton
            produitId={serialized.id}
            produitNom={serialized.nom}
          />
        </div>
      </div>
    </div>
  );
}
