"use client";

import { useTransition } from "react";
import { ShieldUser, X } from "lucide-react";
import { toast } from "sonner";
import { stopImpersonation } from "@/server/admin/impersonation-actions";
import { usePanelLang } from "./panel-lang-context";

interface ImpersonationBannerProps {
  /** Nom complet (prénom + nom) du user impersonné. */
  targetName: string;
  /** Email du user impersonné — affiché en mono pour clarification. */
  targetEmail: string;
}

/**
 * Banner sticky en haut du dashboard, visible UNIQUEMENT quand un admin est
 * en mode SAV (impersonation active). Affiche en quelques mots qui est
 * impersonné + un bouton pour quitter.
 *
 * Style : rouge néon-danger pour qu'on ne l'oublie pas. Toute action faite
 * en mode SAV affecte le compte du client réel.
 */
export function ImpersonationBanner({
  targetName,
  targetEmail,
}: ImpersonationBannerProps) {
  const [pending, startTransition] = useTransition();
  const { t } = usePanelLang();

  const handleStop = () => {
    startTransition(async () => {
      try {
        await stopImpersonation();
        // stopImpersonation redirect vers /admin → on n'arrive jamais ici
        // (mais on garde le toast au cas où le redirect échoue)
        toast.success("Mode SAV terminé");
      } catch (err) {
        // Next.js redirect throws → c'est OK
        const isRedirect =
          err instanceof Error && err.message.includes("NEXT_REDIRECT");
        if (!isRedirect) {
          toast.error("Erreur lors de la sortie du mode SAV");
        }
      }
    });
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--neon-danger)]/40 bg-[var(--neon-danger)] px-4 py-2 text-white shadow-[0_4px_20px_rgba(255,61,113,0.25)] md:px-6"
    >
      <div className="flex items-center gap-2.5 text-sm font-medium">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
          <ShieldUser className="size-3.5" strokeWidth={2} />
        </span>
        <span>
          <span className="font-bold uppercase tracking-wider text-[11px] mr-2">
            {t("impersonation.mode")}
          </span>
          <span>{t("impersonation.actingAs")} </span>
          <strong className="font-bold">{targetName}</strong>
          <span className="ml-1.5 hidden font-mono text-[11px] opacity-80 sm:inline">
            {targetEmail}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        disabled={pending}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-3 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-60"
      >
        <X className="size-3.5" strokeWidth={2} />
        {t("impersonation.exit")}
      </button>
    </div>
  );
}
