"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn, FieldValues } from "react-hook-form";
import { toast } from "sonner";

/**
 * Hook d'auto-save débouncé pour React Hook Form.
 *
 * Comment ça marche :
 *  - Watch toutes les valeurs du form
 *  - À chaque changement, si le form est `isDirty` ET valide, démarre un
 *    timer de `delayMs` (défaut 1500ms)
 *  - Si une nouvelle modif arrive avant l'expiration, reset le timer
 *  - Quand le timer expire, appelle `onSave(values)` puis form.reset(values)
 *    pour clear l'état dirty (sinon ça boucle)
 *
 * Retourne `{ status }` :
 *  - "idle" pas de modification en cours
 *  - "pending" modification en cours, va sauvegarder dans Xms
 *  - "saving" sauvegarde en cours
 *  - "saved" dernière sauvegarde réussie (revient à "idle" après 2s)
 *  - "error" dernière sauvegarde a échoué (avec err message)
 *
 * Le composant peut afficher un indicateur ("Sauvegardé ✓", "Erreur",
 * "Sauvegarde en cours...") basé sur ce status.
 *
 * IMPORTANT :
 *  - Ne PAS utiliser sur des forms dont le submit fait du redirect
 *    (login, etc.) ce serait redirect après chaque keystroke
 *  - L'auto-save N'EST PAS déclenché au mount (pour éviter de save un
 *    form à peine ouvert)
 *  - Si le form est invalide (Zod errors), on ne save pas l'utilisateur
 *    voit les erreurs dans les FormMessage normalement
 */
export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOpts<T extends FieldValues> {
  form: UseFormReturn<T>;
  onSave: (values: T) => Promise<{ ok: boolean; error?: string }>;
  /** Délai de débouncing en ms. Default 1500ms. */
  delayMs?: number;
  /** Si false, désactive complètement l'auto-save (utile pour A/B testing). */
  enabled?: boolean;
}

export function useAutoSave<T extends FieldValues>({
  form,
  onSave,
  delayMs = 1500,
  enabled = true,
}: UseAutoSaveOpts<T>): { status: AutoSaveStatus; errorMessage: string } {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe à TOUS les changements
    const subscription = form.watch((values, info) => {
      // Skip le premier render (au mount, avant qu'aucun champ soit modifié)
      if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false;
        return;
      }

      // Skip si le form n'est pas dirty (ex: reset programmatique)
      if (!form.formState.isDirty) return;

      // Skip si on lit juste les valeurs (pas un user input)
      if (info.type !== "change") return;

      // Reset le timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setStatus("pending");

      timerRef.current = setTimeout(async () => {
        // Valide avant de save
        const isValid = await form.trigger();
        if (!isValid) {
          setStatus("error");
          setErrorMessage("Données invalides");
          return;
        }

        setStatus("saving");
        try {
          const result = await onSave(values as T);
          if (result.ok) {
            setStatus("saved");
            // Reset le dirty state pour éviter les save inutiles ensuite
            form.reset(values as T, { keepValues: true });

            // Revient à "idle" après 2s pour ne pas garder le check vert ad vitam
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
          } else {
            setStatus("error");
            const msg = result.error ?? "Erreur de sauvegarde";
            setErrorMessage(msg);
            // Toast d'erreur visible — sinon l'user voit "Sauvegardé" qui
            // n'apparaît jamais et croit que tout va bien.
            toast.error(`Sauvegarde échouée : ${msg}`, { duration: 6000 });
          }
        } catch (err) {
          setStatus("error");
          const msg = err instanceof Error ? err.message : "Erreur réseau";
          setErrorMessage(msg);
          toast.error(`Sauvegarde échouée : ${msg}`, { duration: 6000 });
        }
      }, delayMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, delayMs]);

  return { status, errorMessage };
}
