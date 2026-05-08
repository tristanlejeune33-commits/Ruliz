"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retranslateMenu } from "@/server/dashboard/translation-actions";

export function RetranslateButton({ restaurantId }: { restaurantId: string }) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    startTransition(async () => {
      const res = await retranslateMenu(restaurantId);
      if (res.ok) {
        const mode = res.data?.mode;
        if (mode === "inngest") {
          toast.success(
            "Re-traduction lancée via Inngest. Disponible dans 1-2 min.",
          );
        } else {
          toast.success(
            "Re-traduction en cours en arrière-plan. Recharge la carte dans ~1 min.",
          );
        }
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={pending}
      title="Force une re-traduction de toute la carte en arrière-plan"
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
