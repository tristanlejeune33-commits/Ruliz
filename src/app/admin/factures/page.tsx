import type { Metadata } from "next";
import {
  CheckCircle2,
  CreditCard,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import {
  HeroEyebrow,
  HeroKpi,
  PageHero,
} from "@/components/shared/page-hero";
import { serialize } from "@/lib/serialize";
import { listBoutiqueCommandesAdmin } from "@/server/admin/boutique/queries";
import {
  getAdminFacturesStats,
  listAllStripeInvoicesAdmin,
} from "@/server/admin/factures-queries";
import { FacturesAdminView } from "./factures-view";

export const metadata: Metadata = {
  title: "Factures · Admin Ruliz",
};

export default async function AdminFacturesPage() {
  // Charge en parallèle : invoices Stripe + commandes en cours
  const [invoices, commandesEnCours] = await Promise.all([
    listAllStripeInvoicesAdmin(),
    listBoutiqueCommandesAdmin({}).then((all) =>
      all.filter((c) => c.statut !== "livree" && c.statut !== "annulee"),
    ),
  ]);
  const stats = await getAdminFacturesStats(invoices);

  return (
    <div className="space-y-8">
      <PageHero
        accent="cyan"
        eyebrow={
          <HeroEyebrow icon={<Receipt className="size-3" strokeWidth={1.75} />}>
            Comptabilité admin
          </HeroEyebrow>
        }
        title="Factures & bons de commande"
        description="Vue centralisée : toutes les factures Stripe (abonnements clients) et tous les bons de commande boutique en cours."
        kpis={
          <>
            <HeroKpi
              label="Factures Stripe"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard
                    className="size-3.5 text-[var(--neon-cyan)]"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums">{stats.totalInvoices}</span>
                </span>
              }
            />
            <HeroKpi
              label="CA encaissé"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    className="size-3.5 text-[var(--neon-success)]"
                    strokeWidth={2}
                  />
                  <span className="tabular-nums">
                    {(stats.totalPaidCentimes / 100).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </span>
              }
            />
            <HeroKpi
              label="BC en cours"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag
                    className="size-3.5 text-[var(--neon-violet)]"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums">
                    {stats.bcEnCours}
                    {stats.bcEnAttente > 0 && (
                      <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[var(--neon-violet)]">
                        ({stats.bcEnAttente} en attente)
                      </span>
                    )}
                  </span>
                </span>
              }
            />
          </>
        }
      />

      <FacturesAdminView
        invoices={invoices}
        commandes={serialize(commandesEnCours)}
      />
    </div>
  );
}
