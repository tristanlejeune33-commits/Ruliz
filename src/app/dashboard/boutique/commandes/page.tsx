import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ImageOff, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroEyebrow, PageHero } from "@/components/shared/page-hero";
import { cn } from "@/lib/utils";
import { listMyBoutiqueCommandes } from "@/server/dashboard/boutique-queries";

export const metadata: Metadata = {
  title: "Mes commandes · Boutique Ruliz",
};

const STATUT_TONE: Record<string, { label: string; classes: string }> = {
  en_attente: {
    label: "En attente",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  },
  en_preparation: {
    label: "En préparation",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  expediee: {
    label: "Expédiée",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  livree: {
    label: "Livrée",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  annulee: {
    label: "Annulée",
    classes:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
  },
};

export default async function MesCommandesPage() {
  const commandes = await listMyBoutiqueCommandes();

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
            Mes commandes
          </HeroEyebrow>
        }
        title="Historique de mes commandes"
        description="Toutes tes commandes boutique avec leur statut de livraison."
      />

      {commandes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShoppingBag
            className="size-10 text-[var(--text-tertiary)]"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Aucune commande pour l&apos;instant
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Visite la boutique pour découvrir nos supports physiques.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/dashboard/boutique">Voir la boutique</Link>
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {commandes.map((c) => {
            const tone = STATUT_TONE[c.statut] ?? STATUT_TONE.en_attente;
            return (
              <Card key={c.id.toString()} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-glass-strong)]">
                    {c.produit.imageUrl ? (
                      <Image
                        src={c.produit.imageUrl}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff
                        className="size-5 text-[var(--text-tertiary)]"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold tracking-tight text-[var(--text-primary)]">
                        {c.produit.nom}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          tone?.classes,
                        )}
                      >
                        {tone?.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {c.quantite}× ·{" "}
                      {format(new Date(c.createdAt), "d MMM yyyy", { locale: fr })}
                      {c.restaurant && (
                        <>
                          <span className="mx-1.5">·</span>
                          {c.restaurant.nom}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
                      {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: c.devise,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
