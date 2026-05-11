"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Sparkles, X } from "lucide-react";
import { ONBOARDING_STEPS, TOTAL_STEPS } from "./steps";
import {
  setOnboardingStep,
  skipOnboarding,
} from "@/server/dashboard/onboarding-actions";

/**
 * OnboardingBubble — bulle guidée persistante 320 px, bottom-right par défaut,
 * ancrée sur un élément DOM si l'étape courante le demande.
 *
 * Stratégie de positionnement :
 *  - Aucune ancre (anchorSelector null) → fixed bottom-right via portal
 *  - Ancre trouvée → Floating UI calcule la position + flèche
 *  - Ancre pas encore montée → MutationObserver attend 2s puis fallback
 *
 * À chaque clic "Suivant" :
 *   1. Server action setOnboardingStep(currentStep + 1) (async, non-bloquant)
 *   2. router.push(nextStep.path) si différent du path courant
 *   3. setCurrentStep(nextStep)
 *
 * Skip = onboardingSkipped: true en DB + bulle disparaît + chip "Reprendre"
 *        accessible depuis la sidebar.
 */

interface OnboardingBubbleProps {
  initialStep: number;
}

export function OnboardingBubble({ initialStep }: OnboardingBubbleProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Démarrage : si initialStep === 0 (jamais démarré), on commence à 1
  const [currentStepId, setCurrentStepId] = useState<number>(
    initialStep === 0 ? 1 : Math.max(1, Math.min(6, initialStep)),
  );
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pending, setPending] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const currentStep = useMemo(
    () => ONBOARDING_STEPS.find((s) => s.id === currentStepId) ?? null,
    [currentStepId],
  );

  // === Détection de l'élément ancre via MutationObserver ===
  // Le DOM peut ne pas avoir l'élément monté au moment du render (lazy load,
  // drawer fermé, route en cours de changement). On observe pendant 3s puis
  // fallback bottom-right.
  useEffect(() => {
    if (!currentStep?.anchorSelector) {
      setAnchorEl(null);
      return;
    }
    if (currentStep.path !== pathname) {
      // On n'est pas encore sur la bonne page, pas la peine d'observer.
      setAnchorEl(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 × 100ms = 3s

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(currentStep.anchorSelector!);
      if (el) {
        setAnchorEl(el);
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryFind, 100);
      } else {
        // Fallback : bulle flottante bottom-right
        setAnchorEl(null);
      }
    };
    tryFind();

    return () => {
      cancelled = true;
    };
  }, [currentStep, pathname]);

  // === Floating UI : positionnement quand ancré ===
  const arrowRef = useRef<SVGSVGElement | null>(null);
  const { refs, floatingStyles, context } = useFloating({
    open: !!anchorEl,
    elements: { reference: anchorEl ?? undefined },
    placement: currentStep?.placement ?? "bottom",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(16),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      arrow({ element: arrowRef, padding: 8 }),
    ],
  });

  // === Pulse ring sur l'élément ancré ===
  useEffect(() => {
    if (!anchorEl) return;
    anchorEl.classList.add("onboarding-pulse");
    return () => {
      anchorEl.classList.remove("onboarding-pulse");
    };
  }, [anchorEl]);

  // === Actions ===
  const handleNext = useCallback(async () => {
    if (!currentStep || pending) return;
    setPending(true);

    const nextId = currentStep.id + 1;
    const nextStep = ONBOARDING_STEPS.find((s) => s.id === nextId);

    if (!nextStep) {
      // Dernière étape → complétion
      await setOnboardingStep(6);
      setCompleted(true);
      setPending(false);
      return;
    }

    // Persiste l'étape suivante avant la navigation
    await setOnboardingStep(nextId);

    if (nextStep.path !== pathname) {
      router.push(nextStep.path);
    }
    setCurrentStepId(nextId);
    setPending(false);
  }, [currentStep, pathname, pending, router]);

  const handleSkipRequest = useCallback(() => {
    setSkipConfirmOpen(true);
  }, []);

  const handleSkipConfirm = useCallback(async () => {
    setPending(true);
    await skipOnboarding();
    setSkipConfirmOpen(false);
    setCompleted(true);
    setPending(false);
  }, []);

  if (completed) return null;
  if (!currentStep) return null;

  // === Position bottom-right si pas d'ancre ===
  const isFloating = !anchorEl;

  // Bulle de confirmation skip
  if (skipConfirmOpen) {
    return (
      <FloatingPortal>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-[9999] w-[320px]"
        >
          <BubbleCard>
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Tu pars déjà ?
              </h3>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Tu peux reprendre le tour quand tu veux depuis « Aide » en bas
                de la sidebar.
              </p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSkipConfirmOpen(false)}
                  className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  disabled={pending}
                >
                  Continuer le tour
                </button>
                <button
                  type="button"
                  onClick={handleSkipConfirm}
                  disabled={pending}
                  className="rounded-md bg-[var(--text-primary)]/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/15"
                >
                  Quitter
                </button>
              </div>
            </div>
          </BubbleCard>
        </motion.div>
      </FloatingPortal>
    );
  }

  return (
    <FloatingPortal>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepId}
          ref={isFloating ? undefined : refs.setFloating}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={
            isFloating
              ? "fixed bottom-6 right-6 z-[9999] w-[320px]"
              : "z-[9999] w-[320px]"
          }
          style={isFloating ? undefined : floatingStyles}
        >
          <BubbleCard>
            {/* Header : avatar + counter + close */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)]/15">
                  <Sparkles className="size-3.5 text-[var(--accent)]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Étape {currentStep.id}/{TOTAL_STEPS}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSkipRequest}
                className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
                aria-label="Fermer le tour"
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-[var(--bg-glass)]">
              <motion.div
                className="h-full bg-[var(--accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep.id / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Titre */}
            <h3 className="mb-1.5 text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {currentStep.title}
            </h3>

            {/* Body */}
            <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {currentStep.body}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              {currentStep.allowSkip ? (
                <button
                  type="button"
                  onClick={handleSkipRequest}
                  disabled={pending}
                  className="text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Passer le tour
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={pending}
                className="rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {currentStep.cta}
              </button>
            </div>

            {/* Flèche d'ancrage (visible seulement si ancré) */}
            {!isFloating && (
              <FloatingArrow
                ref={arrowRef}
                context={context}
                fill="var(--bg-elevated, #1a1a1a)"
                stroke="var(--accent)"
                strokeWidth={1}
                width={14}
                height={7}
              />
            )}
          </BubbleCard>
        </motion.div>
      </AnimatePresence>
    </FloatingPortal>
  );
}

function BubbleCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-4 shadow-2xl backdrop-blur-md"
      style={{
        background: "var(--bg-popover-solid, var(--bg-elevated))",
        borderColor: "color-mix(in oklch, var(--accent) 30%, transparent)",
      }}
    >
      {children}
    </div>
  );
}
