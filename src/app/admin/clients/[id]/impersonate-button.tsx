"use client";

import { useTransition } from "react";
import { ShieldUser } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startImpersonation } from "@/server/admin/impersonation-actions";

interface ImpersonateButtonProps {
  targetUserId: string;
  targetName: string;
}

/**
 * Bouton pour démarrer une session d'impersonation. Affiché sur la page admin
 * client (/admin/clients/[id]). En cliquant, l'admin est redirigé vers
 * /dashboard où il agit en tant que ce client (mode SAV).
 *
 * Le bouton est volontairement voyant (variant primary cyan) car c'est une
 * action puissante : tout ce qui est fait dans le dashboard pendant la session
 * affecte le compte du client réel.
 */
export function ImpersonateButton({
  targetUserId,
  targetName,
}: ImpersonateButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !window.confirm(
        `Tu vas accéder au panel de "${targetName}" en mode SAV.\n\n` +
          `Toutes les modifications faites pendant cette session affecteront le compte de ce client.\n\n` +
          `Continuer ?`,
      )
    )
      return;

    startTransition(async () => {
      try {
        await startImpersonation({ targetUserId });
        // startImpersonation redirect vers /dashboard
      } catch (err) {
        const isRedirect =
          err instanceof Error && err.message.includes("NEXT_REDIRECT");
        if (!isRedirect) {
          toast.error("Erreur lors du démarrage du mode SAV");
        }
      }
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      variant="primary"
      size="sm"
      className="gap-2"
    >
      <ShieldUser className="size-3.5" strokeWidth={1.75} />
      {pending ? "Connexion…" : "Accéder au panel client"}
    </Button>
  );
}
