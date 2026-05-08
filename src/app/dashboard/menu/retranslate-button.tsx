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
        toast.success(
          "Re-traduction lancée. Les langues seront mises à jour dans 1-2 min.",
        );
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
