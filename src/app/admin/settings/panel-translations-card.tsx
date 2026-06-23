"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Languages, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, type SupportedLang } from "@/lib/langs";
import {
  getPanelWarmStatus,
  warmAllPanelTranslations,
} from "@/server/admin/translation-actions";

type WarmStatus = {
  total: number;
  perLang: Array<{ lang: string; count: number }>;
  done: boolean;
};

/**
 * Carte admin : pré-traduit toutes les chaînes UI du panel déjà rencontrées
 * vers les 7 langues. Une fois le cache rempli, le serveur injecte le dico
 * complet à l'ouverture d'une page → affichage traduit instantané, sans
 * chargement. Le travail tourne en arrière-plan ; cette carte affiche
 * l'avancement par langue.
 */
export function PanelTranslationsCard() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<WarmStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // True juste après un lancement → on poll l'avancement automatiquement.
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await getPanelWarmStatus();
    setRefreshing(false);
    if (res.ok && res.data) setStatus(res.data);
    return res.ok ? res.data ?? null : null;
  }, []);

  // Charge l'avancement à l'ouverture.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-poll toutes les 5s tant que la pré-traduction n'est pas terminée.
  useEffect(() => {
    if (!polling) return;
    pollRef.current = setInterval(async () => {
      const data = await refresh();
      if (data?.done) {
        setPolling(false);
        toast.success("Pré-traduction terminée — toutes les langues sont prêtes.");
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, refresh]);

  const run = () => {
    startTransition(async () => {
      const result = await warmAllPanelTranslations();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Pré-traduction lancée : ${result.data?.strings ?? 0} chaînes × ${result.data?.langs ?? 0} langues. Avancement affiché ci-dessous.`,
      );
      setPolling(true);
      void refresh();
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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" strokeWidth={1.75} />
            )}
            Rafraîchir l&apos;avancement
          </Button>
          {status?.done && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--neon-success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--neon-success)]">
              <CheckCircle2 className="size-3.5" strokeWidth={2} />
              Terminé — toutes les langues prêtes
            </span>
          )}
          {polling && !status?.done && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Loader2 className="size-3.5 animate-spin" />
              Traduction en cours…
            </span>
          )}
        </div>

        {status && (
          <ul className="space-y-2">
            {status.perLang.map((p) => {
              const meta = LANG_META[p.lang as SupportedLang];
              const pct =
                status.total > 0
                  ? Math.round((p.count / status.total) * 100)
                  : 0;
              const complete = p.count >= status.total;
              return (
                <li key={p.lang} className="flex items-center gap-3">
                  <FlagIcon lang={p.lang as SupportedLang} width={18} rounded />
                  <span className="w-20 shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                    {meta?.name ?? p.lang}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        complete
                          ? "bg-[var(--neon-success)]"
                          : "bg-[var(--neon-cyan)]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--text-tertiary)]">
                    {p.count}/{status.total}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
