import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { serialize } from "@/lib/serialize";
import { listBoutiqueCommandesAdmin } from "@/server/admin/boutique/queries";
import { CommandesAdminView } from "./commandes-view";

export const metadata: Metadata = {
  title: "Commandes boutique Admin Ruliz",
};

const VALID_STATUTS = [
  "en_attente",
  "en_preparation",
  "expediee",
  "livree",
  "annulee",
] as const;

interface PageProps {
  searchParams: Promise<{ statut?: string; q?: string }>;
}

export default async function AdminBoutiqueCommandesPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const statut = (VALID_STATUTS as readonly string[]).includes(params.statut ?? "")
    ? (params.statut as (typeof VALID_STATUTS)[number])
    : undefined;
  const query = params.q ?? "";

  const commandes = await listBoutiqueCommandesAdmin({ statut, query });

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
        description="Filtre par statut, cherche un client, exporte en CSV."
      />

      <CommandesAdminView
        commandes={serialize(commandes)}
        currentStatut={statut ?? "all"}
        currentQuery={query}
      />
    </div>
  );
}
