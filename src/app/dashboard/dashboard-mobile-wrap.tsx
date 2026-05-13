"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { FAB } from "@/components/ui/fab";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { toast } from "sonner";

/**
 * DashboardMobileWrap wrapper client qui ajoute pull-to-refresh + FAB
 * autour du contenu du Tableau de bord.
 *
 * - Pull-to-refresh : `router.refresh()` re-render la route avec
 *   les nouvelles data Server Components (cache invalidé)
 * - FAB "Voir ma carte" : ouvre la carte publique dans un nouvel onglet
 *   (action #1 du restaurateur depuis son dashboard)
 *
 * Ne touche pas au rendu desktop (FAB est `lg:hidden` côté composant).
 */

interface DashboardMobileWrapProps {
  publicMenuUrl: string;
  children: React.ReactNode;
}

export function DashboardMobileWrap({
  publicMenuUrl,
  children,
}: DashboardMobileWrapProps) {
  const router = useRouter();

  const handleRefresh = async () => {
    router.refresh();
    // Petit délai cosmétique pour que le spinner ait le temps de tourner ;
    // router.refresh() ne retourne pas de promise, on simule.
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Données à jour");
  };

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>{children}</PullToRefresh>

      <FAB
        asChild
        icon={<ExternalLink />}
        label="Voir ma carte publique"
      >
        <Link href={publicMenuUrl} target="_blank" rel="noreferrer" />
      </FAB>
    </>
  );
}
