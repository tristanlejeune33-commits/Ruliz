"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restartOnboarding } from "@/server/dashboard/onboarding-actions";

/**
 * Bouton "Réactiver le didacticiel" · reset onboarding_step à 0, clear
 * onboarding_skipped et onboarding_completed, puis router.refresh() pour
 * que le layout dashboard re-monte avec la bulle.
 */
export function RestartTourButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const handleRestart = () => {
    startTransition(async () => {
      const res = await restartOnboarding();
      if (res.ok) {
        toast.success("Didacticiel réactivé · la bulle va réapparaître 👋");
        setDone(true);
        router.refresh();
        // Redirige sur /dashboard pour démarrer à l'étape 1
        setTimeout(() => router.push("/dashboard"), 300);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleRestart}
      disabled={pending || done}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <GraduationCap className="size-3.5" strokeWidth={1.75} />
      )}
      {done ? "Démarrage…" : "Réactiver le didacticiel"}
    </Button>
  );
}
