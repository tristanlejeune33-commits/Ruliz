"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

/**
 * SwipeableListItem · wrapper qui révèle des actions au swipe horizontal.
 *
 * Spec : `docs/design-system-mobile.md` §8 SwipeableListItem
 *
 * - Swipe gauche révèle 1-2 actions à droite (Modifier, Supprimer)
 * - Swipe droite révèle 1 action à gauche (Activer, Dupliquer)
 * - Threshold 60px pour révéler, 120px pour auto-trigger l'action principale
 * - Haptic léger à la révélation, medium au déclenchement
 * - Indicateur d'affordance optionnel : oscillation 1× au 1er rendu
 * - Sur desktop (≥ lg) : pas de swipe, les actions deviennent des boutons
 *   au survol (à câbler côté consommateur si besoin)
 *
 * Usage type :
 *   <SwipeableListItem
 *     leftAction={{ icon: Star, label: "Activer", onTrigger: () => activer(), tone: "success" }}
 *     rightActions={[
 *       { icon: Edit, label: "Modifier", onTrigger: () => editer() },
 *       { icon: Trash, label: "Supprimer", onTrigger: () => supprimer(), tone: "danger" },
 *     ]}
 *   >
 *     <PlatCard plat={plat} />
 *   </SwipeableListItem>
 */

interface SwipeAction {
  icon: LucideIcon;
  label: string;
  onTrigger: () => void;
  tone?: "default" | "success" | "danger";
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightActions?: SwipeAction[];
  /** Largeur d'une action en px. Défaut 80. */
  actionWidth?: number;
  /** Affiche l'oscillation d'affordance au 1er rendu. */
  showAffordance?: boolean;
  className?: string;
}

const REVEAL_THRESHOLD = 60;
const TRIGGER_THRESHOLD = 120;

const TONE_CLASSES: Record<NonNullable<SwipeAction["tone"]>, string> = {
  default: "bg-[var(--bg-glass-strong)] text-[var(--text-primary)]",
  success: "bg-[var(--neon-success)] text-[var(--bg-primary)]",
  danger: "bg-[var(--neon-danger)] text-white",
};

export function SwipeableListItem({
  children,
  leftAction,
  rightActions = [],
  actionWidth = 80,
  showAffordance = false,
  className,
}: SwipeableListItemProps) {
  const x = useMotionValue(0);
  const hasRevealed = React.useRef(false);
  const constraints = React.useMemo(() => {
    const left = leftAction ? -actionWidth : 0;
    const right = rightActions.length * actionWidth;
    return { left: -right, right: -left };
  }, [leftAction, rightActions, actionWidth]);

  // Affordance d'init : oscillation 1× pour signaler que c'est swipeable
  React.useEffect(() => {
    if (!showAffordance) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      animate(x, [0, -24, 0], {
        duration: 0.8,
        ease: "easeOut",
      });
    }, 400);
    return () => clearTimeout(t);
  }, [showAffordance, x]);

  // Haptic à la révélation
  const handleDrag = React.useCallback(
    (_: PointerEvent, info: { offset: { x: number } }) => {
      const abs = Math.abs(info.offset.x);
      if (abs > REVEAL_THRESHOLD && !hasRevealed.current) {
        hasRevealed.current = true;
        haptic.light();
      }
      if (abs < REVEAL_THRESHOLD) {
        hasRevealed.current = false;
      }
    },
    [],
  );

  const handleDragEnd = React.useCallback(
    (_: PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
      const dx = info.offset.x;
      const vx = info.velocity.x;

      // Auto-trigger si dépassé le threshold (et action existe dans la direction)
      if (dx <= -TRIGGER_THRESHOLD && rightActions.length > 0) {
        // Si une seule action OU action principale = la plus à droite → on trigger
        const primary = rightActions[rightActions.length - 1];
        if (primary) {
          haptic.medium();
          primary.onTrigger();
          animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
          return;
        }
      }
      if (dx >= TRIGGER_THRESHOLD && leftAction) {
        haptic.medium();
        leftAction.onTrigger();
        animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
        return;
      }

      // Sinon : snap vers révélé OU snap vers fermé selon la position
      if (dx <= -REVEAL_THRESHOLD || vx < -300) {
        const target = -rightActions.length * actionWidth;
        animate(x, target, { type: "spring", stiffness: 400, damping: 32 });
      } else if (dx >= REVEAL_THRESHOLD || vx > 300) {
        const target = leftAction ? actionWidth : 0;
        animate(x, target, { type: "spring", stiffness: 400, damping: 32 });
      } else {
        animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
      }
    },
    [x, leftAction, rightActions, actionWidth],
  );

  // Reset au tap sur l'item lui-même
  const handleTap = React.useCallback(() => {
    animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
  }, [x]);

  // Visibilité actions selon la direction du swipe
  const leftActionOpacity = useTransform(x, [0, REVEAL_THRESHOLD], [0, 1]);
  const rightActionsOpacity = useTransform(x, [-REVEAL_THRESHOLD, 0], [1, 0]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        // Sur desktop, désactive le swipe (les actions sont accessibles via menu / hover)
        "lg:overflow-visible",
        className,
      )}
    >
      {/* Action gauche (swipe → droite) */}
      {leftAction && (
        <motion.button
          type="button"
          onClick={() => {
            haptic.light();
            leftAction.onTrigger();
            animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
          }}
          aria-label={leftAction.label}
          style={{ width: actionWidth, opacity: leftActionOpacity }}
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-center gap-1 lg:hidden",
            TONE_CLASSES[leftAction.tone ?? "default"],
          )}
        >
          <leftAction.icon className="size-5" strokeWidth={1.75} />
        </motion.button>
      )}

      {/* Actions droite (swipe → gauche) */}
      {rightActions.length > 0 && (
        <div
          style={{ width: rightActions.length * actionWidth }}
          className="absolute inset-y-0 right-0 flex lg:hidden"
        >
          {rightActions.map((action, i) => (
            <motion.button
              key={action.label}
              type="button"
              onClick={() => {
                haptic.light();
                action.onTrigger();
                animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
              }}
              aria-label={action.label}
              style={{
                width: actionWidth,
                opacity: rightActionsOpacity,
              }}
              className={cn(
                "flex items-center justify-center gap-1",
                TONE_CLASSES[action.tone ?? "default"],
                i === rightActions.length - 1 && "rounded-r-xl",
              )}
            >
              <action.icon className="size-5" strokeWidth={1.75} />
            </motion.button>
          ))}
        </div>
      )}

      {/* Contenu draggable */}
      <motion.div
        drag={typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? false : "x"}
        dragConstraints={constraints}
        dragElastic={0.1}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        style={{ x, touchAction: "pan-y" }}
        className="relative bg-[var(--bg-card)] rounded-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
