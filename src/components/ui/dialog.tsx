"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * DialogContent responsive :
 *   - Mobile (< lg) : bottom sheet plein-largeur, slide-up depuis le bas,
 *     max 92dvh avec scroll interne, padding-bottom safe-area, drag handle
 *     visuel en haut. Touch target Close 44×44.
 *   - Desktop (≥ lg) : modale centrée classique (slide-in zoom).
 *
 * Tous les Dialog du dashboard (édition plat, catégorie, popup, etc.)
 * bénéficient automatiquement du comportement mobile-first.
 */
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Fond solide --bg-popover-solid (opaque dans les 2 thèmes) pour
        // garantir l'opacité, peu importe le fond du body.
        "fixed z-50 flex flex-col border border-[var(--border-glass-hover)] bg-[var(--bg-popover-solid)] shadow-2xl outline-none",
        // === Mobile : bottom sheet plein-écran ===
        "inset-x-0 bottom-0 max-h-[95dvh] w-full rounded-t-2xl pt-5",
        "safe-bottom-min-5",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // === Desktop ≥ lg : modale centrée ===
        "lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[90vh] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:p-6 lg:pt-6 lg:pb-6",
        "lg:data-[state=closed]:slide-out-to-left-1/2 lg:data-[state=closed]:slide-out-to-top-[48%] lg:data-[state=open]:slide-in-from-left-1/2 lg:data-[state=open]:slide-in-from-top-[48%]",
        "lg:data-[state=open]:zoom-in-95 lg:data-[state=closed]:zoom-out-95",
        // Animations communes
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    >
      {/* Drag handle visuel mobile (purement décoratif Radix gère pas le drag) */}
      <div className="mx-auto mb-2 flex h-3 w-full items-center justify-center lg:hidden">
        <div className="drag-handle" aria-hidden />
      </div>

      {/* Contenu scrollable interne pour gérer les longs formulaires sans
          déborder hors du bottom sheet */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 lg:px-0 lg:pb-0">
        {children}
      </div>

      <DialogPrimitive.Close
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-[var(--text-muted)] opacity-70 transition-opacity hover:bg-[var(--bg-elevated)] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:pointer-events-none lg:right-4 lg:top-4 lg:size-7 lg:rounded-md lg:p-1"
        aria-label="Fermer"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  // Mobile : sticky en haut du bottom sheet (au-dessus du contenu scrollable)
  // pour que le titre + close restent visibles même quand on scrolle dans
  // un formulaire long. Desktop : layout standard.
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      "sticky top-0 z-10 -mx-5 -mt-2 bg-[var(--bg-card)] px-5 pb-3 pt-1 lg:relative lg:m-0 lg:bg-transparent lg:p-0",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  // Mobile : sticky bottom du bottom sheet pour que les CTA (Enregistrer /
  // Supprimer) restent toujours accessibles, même dans un formulaire long.
  // Desktop : layout standard align-end horizontal.
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2",
      "sticky bottom-0 z-10 -mx-5 -mb-5 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-3 lg:relative lg:m-0 lg:border-t-0 lg:bg-transparent lg:p-0",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[var(--text-secondary)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
