import type { Metadata } from "next";
import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { serialize } from "@/lib/serialize";
import {
  getBoutiqueAdminStats,
  listBoutiqueProduitsAdmin,
} from "@/server/admin/boutique/queries";
import { getShippingSettings } from "@/server/admin/boutique/shipping-actions";
import { BoutiqueAdminView } from "./boutique-admin-view";
import { ShippingEditor } from "./shipping-editor";

export const metadata: Metadata = {
  title: "Boutique QR · Admin Ruliz",
};

export default async function AdminBoutiquePage() {
  const [produits, stats, shipping] = await Promise.all([
    listBoutiqueProduitsAdmin(),
    getBoutiqueAdminStats(),
    getShippingSettings(),
  ]);

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
        title="Catalogue produits"
        description="Gère les produits que tes clients restaurateurs peuvent commander : sets de table, stickers, présentoirs, supports vitrine."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/boutique/commandes">
              <ShoppingBag className="size-3.5" strokeWidth={1.75} />
              Voir les commandes
              {stats.enAttente > 0 && (
                <span className="ml-1 rounded-md bg-[var(--neon-danger-soft)] px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--neon-danger)]">
                  {stats.enAttente} en attente
                </span>
              )}
            </Link>
          </Button>
        }
        kpis={
          <>
            <HeroKpi
              label="Publiés"
              value={
                <span className="tabular-nums">
                  {stats.publies}
                  <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    / {stats.totalProduits}
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="Commandes"
              value={
                <span className="tabular-nums">{stats.totalCommandes}</span>
              }
            />
            <HeroKpi
              label="CA boutique"
              value={
                <span className="tabular-nums">
                  {(stats.revenueCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              }
            />
          </>
        }
      />

      <BoutiqueAdminView produits={serialize(produits)} />

      {/* === Paramètres frais de port === */}
      <ShippingEditor initial={shipping} />
    </div>
  );
}
