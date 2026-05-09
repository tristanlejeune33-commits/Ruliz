"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retranslateMenu } from "@/server/dashboard/translation-actions";

export function RetranslateButton({ restaurantId }: { restaurantId: string }) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    // Toast persistant pour montrer la progression
    const toastId = toast.loading(
      "Traduction en cours… (peut prendre 30s à 2 min selon la taille du menu)",
    );

    startTransition(async () => {
      const res = await retranslateMenu(restaurantId);
      toast.dismiss(toastId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const mode = res.data?.mode;
      if (mode === "inngest") {
        toast.success(
          "Re-traduction lancée. Les langues seront disponibles dans 1-2 min.",
        );
      } else {
        const stats = res.data;
        const counts = stats?.produits != null && stats?.categories != null
          ? `${stats.produits} produits, ${stats.categories} catégories traduits`
          : "Re-traduction terminée";
        toast.success(`✅ ${counts}. Tu peux recharger la carte.`);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={pending}
      title="Force une re-traduction de toute la carte"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Languages className="size-3.5" />
      )}
      Re-traduire
    </Button>
  );
}
