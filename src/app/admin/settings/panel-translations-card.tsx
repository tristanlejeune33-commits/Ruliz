"use client";

import { useTransition } from "react";
import { Languages, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { warmAllPanelTranslations } from "@/server/admin/translation-actions";

/**
 * Carte admin : pré-traduit toutes les chaînes UI du panel déjà rencontrées
 * vers les 7 langues. Une fois le cache rempli, le serveur injecte le dico
 * complet à l'ouverture d'une page → affichage traduit instantané, sans
 * chargement. Le travail tourne en arrière-plan.
 */
export function PanelTranslationsCard() {
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await warmAllPanelTranslations();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Pré-traduction lancée : ${result.data?.strings ?? 0} chaînes × ${result.data?.langs ?? 0} langues. Le cache se remplit en arrière-plan (quelques minutes).`,
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30">
            <Languages className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle>Pré-traduire le panel</CardTitle>
            <CardDescription className="mt-1">
              Traduit l&apos;intégralité des textes d&apos;interface du panel
              (catalogue extrait automatiquement du code) vers les 7 langues et
              remplit le cache. Un seul clic suffit — aucune navigation manuelle
              préalable nécessaire. Ensuite, les restaurateurs étrangers voient
              leur panel traduit instantanément, sans aucun temps de chargement.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={run}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" strokeWidth={1.75} />
          )}
          Pré-traduire toutes les langues
        </Button>
      </CardContent>
    </Card>
  );
}
