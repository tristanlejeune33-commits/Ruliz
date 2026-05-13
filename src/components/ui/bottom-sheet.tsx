"use client";

import * as React from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

/**
 * BottomSheet wrapper sobre autour de Vaul, aligné sur le DS Ruliz
 * (glass + tokens néon/light) et la spec mobile (drag handle, snap points,
 * safe-area-bottom, hauteur dynamique).
 *
 * Spec : `docs/design-system-mobile.md` §8 BottomSheet
 *
 * Usage type :
 *   <BottomSheet open={open} onOpenChange={setOpen} snapPoints={[0.6, 0.95]}>
 *     <BottomSheetHeader>
 *       <BottomSheetTitle>Modifier le plat</BottomSheetTitle>
 *     </BottomSheetHeader>
 *     <BottomSheetBody>...</BottomSheetBody>
 *     <BottomSheetFooter>
 *       <Button>Enregistrer</Button>
 *     </BottomSheetFooter>
 *   </BottomSheet>
 *
 * Sur desktop (≥ lg) : Vaul auto-bascule en modal centrée pas besoin de
 * gérer manuellement.
 */

interface BottomSheetProps {
  /** État ouvert/fermé. Sheet controlled. */
  open?: boolean;
  /** Callback de changement d'état (ouverture/fermeture). */
  onOpenChange?: (open: boolean) => void;
  /** Snap points fractionnels (0 → 1 = % de la hauteur viewport). Défaut : full. */
  snapPoints?: (string | number)[];
  /** Snap initial (index dans `snapPoints`). */
  defaultSnap?: number;
  /** Cache la poignée drag (rare, à n'utiliser que pour les sheets non-dismissibles). */
  hideHandle?: boolean;
  /** Désactive le clic backdrop pour fermer. */
  dismissible?: boolean;
  /** Mode modal (lock body scroll, focus trap). */
  modal?: boolean;
  /** Direction d'ouverture du sheet. Défaut : bottom. */
  direction?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function BottomSheet({
  snapPoints,
  defaultSnap,
  hideHandle = false,
  dismissible = true,
  children,
  ...rootProps
}: BottomSheetProps) {
  const [activeSnap, setActiveSnap] = React.useState<string | number | null>(
    snapPoints && defaultSnap !== undefined
      ? snapPoints[defaultSnap] ?? snapPoints[0] ?? null
      : null,
  );

  return (
    <Vaul.Root
      shouldScaleBackground={false}
      dismissible={dismissible}
      snapPoints={snapPoints}
      activeSnapPoint={snapPoints ? activeSnap : undefined}
      setActiveSnapPoint={snapPoints ? setActiveSnap : undefined}
      {...rootProps}
    >
      <Vaul.Portal>
        <Vaul.Overlay
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: "var(--z-sheet-backdrop)" }}
        />
        <Vaul.Content
          className={cn(
            "fixed inset-x-0 bottom-0 mt-24 flex flex-col rounded-t-2xl outline-none",
            "bg-[var(--bg-primary)] border-t border-[var(--border-glass)]",
            "shadow-sheet safe-bottom-min-5",
            // Sur desktop, Vaul rend une modale centrée : on adapte le radius
            "lg:inset-x-auto lg:left-1/2 lg:right-auto lg:bottom-1/2 lg:mt-0 lg:max-w-lg lg:-translate-x-1/2 lg:translate-y-1/2 lg:rounded-2xl lg:border",
          )}
          style={{ zIndex: "var(--z-sheet)" }}
        >
          {!hideHandle && (
            <div className="mx-auto mt-3 flex h-6 w-full items-center justify-center lg:hidden">
              <div className="drag-handle" aria-hidden />
            </div>
          )}
          {children}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

/** Trigger sémantique wrapper Vaul.Trigger. */
export const BottomSheetTrigger = Vaul.Trigger;

/** Header structuré : titre + description optionnelle, padding harmonisé. */
export function BottomSheetHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-5 pb-3 pt-2 text-left lg:pt-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BottomSheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Vaul.Title asChild>
      <h2
        className={cn(
          "text-h3-mobile font-semibold text-[var(--text-primary)]",
          className,
        )}
        {...props}
      />
    </Vaul.Title>
  );
}

export function BottomSheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <Vaul.Description asChild>
      <p
        className={cn(
          "text-sm text-[var(--text-secondary)] leading-relaxed",
          className,
        )}
        {...props}
      />
    </Vaul.Description>
  );
}

/** Corps scrollable interne (overscroll-behavior contain pour ne pas scroller le body). */
export function BottomSheetBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Footer sticky avec safe-area, idéal pour CTA principal. */
export function BottomSheetFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-[var(--border-glass)] bg-[var(--bg-primary)] px-5 pb-2 pt-3",
        "safe-bottom-min-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const BottomSheetClose = Vaul.Close;
