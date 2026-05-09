"use client";

import { useState, useTransition } from "react";
import { Languages, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { retranslateMenu } from "@/server/dashboard/translation-actions";

export function RetranslateButton({ restaurantId }: { restaurantId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handle = (force: boolean) => {
    setOpen(false);
    const toastId = toast.loading(
      force
        ? "Re-traduction forcée en cours… (peut prendre 1-3 min)"
        : "Traduction des nouveaux éléments en cours…",
    );

    startTransition(async () => {
      const res = await retranslateMenu(restaurantId, undefined, force);
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
        const counts =
          stats?.produits != null && stats?.categories != null
            ? `${stats.produits} produits, ${stats.categories} catégories traduits`
            : "Re-traduction terminée";
        toast.success(`✅ ${counts}. Tu peux recharger la carte.`);
      }
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          title="Lance ou force une re-traduction"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Languages className="size-3.5" />
          )}
          Re-traduire
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => handle(false)} className="flex-col items-start gap-0.5">
          <span className="font-medium">Traduire les nouveautés</span>
          <span className="text-xs text-[var(--text-muted)]">
            Skip les produits déjà traduits (rapide).
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle(true)} className="flex-col items-start gap-0.5">
          <span className="flex items-center gap-1.5 font-medium">
            <RefreshCw className="size-3" />
            Tout re-traduire (forcer)
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Écrase toutes les traductions existantes. Utile après un changement
            de données ou de schéma.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
