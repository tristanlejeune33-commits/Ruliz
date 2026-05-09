import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { serialize } from "@/lib/serialize";
import { listBoutiqueCommandesAdmin } from "@/server/admin/boutique/queries";
import { CommandesAdminTable } from "./commandes-table";

export const metadata: Metadata = {
  title: "Commandes boutique · Admin Ruliz",
};

export default async function AdminBoutiqueCommandesPage() {
  const commandes = await listBoutiqueCommandesAdmin();

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/boutique">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Catalogue
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
            Commandes
          </HeroEyebrow>
        }
        title="Toutes les commandes boutique"
        description="Gère les commandes passées par les restaurateurs sur la boutique QR : préparation, expédition, livraison."
      />

      <CommandesAdminTable commandes={serialize(commandes)} />
    </div>
  );
}
