/**
 * Haptic feedback léger pour mobile.
 *
 * Wrap `navigator.vibrate` (Android Chrome + Firefox) avec no-op gracieux
 * sur iOS Safari (qui n'expose pas l'API). Ne déclenche jamais d'erreur
 * sur server side ni sur device sans support.
 *
 * Usage type :
 *   import { haptic } from "@/lib/haptic";
 *   haptic.light();      // tap léger (FAB, switch)
 *   haptic.medium();     // long press confirmé, swipe action révélée
 *   haptic.success();    // optimistic update validé, save OK
 *   haptic.error();      // rollback, validation échouée
 *   haptic.selection();  // navigation entre items, picker scroll
 */

const isClient = typeof window !== "undefined";

function buzz(pattern: number | number[]) {
  if (!isClient) return;
  const nav = window.navigator;
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    // iOS Safari + autres : silencieux
  }
}

export const haptic = {
  /** Tap léger (10ms) · FAB, toggle, sélection rapide. */
  light: () => buzz(10),
  /** Tap moyen (15ms) · confirmation long press, item sélectionné. */
  medium: () => buzz(15),
  /** Pattern sélection (5/10/5) · défilement segmenté, picker. */
  selection: () => buzz([5, 10, 5]),
  /** Pattern succès (10/50/10) · save validé, optimistic update OK. */
  success: () => buzz([10, 50, 10]),
  /** Pattern erreur (50/30/50) · rollback, validation refusée. */
  error: () => buzz([50, 30, 50]),
};
