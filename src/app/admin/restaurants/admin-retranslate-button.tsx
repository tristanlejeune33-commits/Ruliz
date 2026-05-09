"use client";

import { useState, useTransition } from "react";
import {
  Languages,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminRetranslateRestaurant } from "@/server/admin/translation-actions";

interface AdminRetranslateButtonProps {
  restaurantId: string;
  restaurantNom: string;
}

export function AdminRetranslateButton({
  restaurantId,
  restaurantNom,
}: AdminRetranslateButtonProps) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handle = (force: boolean) => {
    setOpen(false);
    const toastId = toast.loading(
      force
        ? `Re-traduction forcée de "${restaurantNom}" en cours…`
        : `Traduction des nouveautés de "${restaurantNom}"…`,
      { description: "Peut prendre 30s à 3min selon la taille du menu" },
    );

    startTransition(async () => {
      const res = await adminRetranslateRestaurant(restaurantId, force);
      toast.dismiss(toastId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const stats = res.data;
      toast.success(
        `✅ ${restaurantNom} : ${stats?.produits ?? 0} produits + ${stats?.categories ?? 0} catégories traduits`,
      );
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label="Re-traduire le menu"
          title="Re-traduire le menu de ce restaurant"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Languages className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem
          onClick={() => handle(false)}
          className="flex-col items-start gap-0.5"
        >
          <span className="font-medium">Traduire les nouveautés</span>
          <span className="text-xs text-[var(--text-muted)]">
            Skip les produits déjà traduits.
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handle(true)}
          className="flex-col items-start gap-0.5"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <RefreshCw className="size-3" />
            Tout re-traduire (forcer)
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Écrase tout. Utile après changement de la langue native.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
