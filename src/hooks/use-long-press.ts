"use client";

import { useCallback, useRef } from "react";

/**
 * useLongPress — détecte un appui long (≥ 500ms par défaut) sans annuler le tap.
 *
 * Spec : `docs/design-system-mobile.md` §8 LongPressMenu
 *
 * Retourne des handlers à étaler sur le composant cible.
 * Si le doigt bouge de > `tolerance` px pendant l'appui, on annule (= scroll).
 *
 * Usage type :
 *   const longPress = useLongPress({ onLongPress: () => setMenuOpen(true) });
 *   <PlatCard {...longPress}>...</PlatCard>
 */

interface UseLongPressOptions {
  onLongPress: (event: React.PointerEvent) => void;
  /** Durée de pression avant déclenchement, en ms. Défaut 500. */
  delay?: number;
  /** Tolérance de mouvement en px avant annulation. Défaut 10. */
  tolerance?: number;
}

export function useLongPress({
  onLongPress,
  delay = 500,
  tolerance = 10,
}: UseLongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const triggered = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPos.current = null;
    triggered.current = false;
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return; // Skip clic droit
      startPos.current = { x: e.clientX, y: e.clientY };
      triggered.current = false;
      timer.current = setTimeout(() => {
        triggered.current = true;
        onLongPress(e);
      }, delay);
    },
    [onLongPress, delay],
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current || !timer.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > tolerance || dy > tolerance) {
        cancel();
      }
    },
    [cancel, tolerance],
  );

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    /** Pour empêcher le menu contextuel natif sur long-press desktop. */
    onContextMenu: (e: React.MouseEvent) => {
      if (triggered.current) e.preventDefault();
    },
  };
}
