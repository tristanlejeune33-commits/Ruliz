import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { prisma } from "@/lib/db";
import { getActingUserId } from "@/lib/impersonation";
import { serialize } from "@/lib/serialize";
import { getHydratedCart } from "@/server/dashboard/boutique-queries";
import { getShippingSettings } from "@/server/admin/boutique/shipping-actions";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Panier · Boutique Ruliz",
};

export default async function PanierPage() {
  const cart = await getHydratedCart();
  const shipping = await getShippingSettings();

  // Restaurants + adresse user pour le checkout
  const acting = await getActingUserId();
  const restaurants = acting
    ? await prisma.restaurant.findMany({
        where: { userId: acting.actingUserId },
        select: { id: true, nom: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const userProfile = acting
    ? await prisma.user.findUnique({
        where: { id: acting.actingUserId },
        select: {
          prenom: true,
          nom: true,
          adresse: true,
          codePostal: true,
          ville: true,
          pays: true,
          telephone: true,
        },
      })
    : null;

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

      <PageHero
        accent="violet"
        eyebrow={
          <HeroEyebrow
            tone="violet"
            icon={<ShoppingBag className="size-3" strokeWidth={1.75} />}
          >
            Panier
          </HeroEyebrow>
        }
        title="Mon panier"
        description="Vérifie tes articles et finalise ta commande."
      />

      {cart.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShoppingBag
            className="size-10 text-[var(--text-tertiary)]"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Ton panier est vide
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Visite la boutique pour ajouter des articles.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/dashboard/boutique">Voir la boutique</Link>
          </Button>
        </Card>
      ) : (
        <CartView
          items={cart.map((c) => ({
            produitId: c.produitId,
            quantite: c.quantite,
            totalCentimes: c.totalCentimes,
            produit: serialize(c.produit),
          }))}
          restaurants={restaurants.map((r) => ({
            id: r.id.toString(),
            nom: r.nom,
          }))}
          defaultLivraison={{
            nom: [userProfile?.prenom, userProfile?.nom]
              .filter(Boolean)
              .join(" "),
            adresse: userProfile?.adresse ?? "",
            codePostal: userProfile?.codePostal ?? "",
            ville: userProfile?.ville ?? "",
            pays: userProfile?.pays ?? "France",
            telephone: userProfile?.telephone ?? "",
          }}
          shipping={shipping}
        />
      )}
    </div>
  );
}
