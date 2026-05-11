"use client";

import { useState } from "react";
import { EmojiPicker as FrimoussePicker } from "frimousse";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * EmojiPicker — wrapper Popover Radix autour de `frimousse`.
 *
 * Frimousse fournit l'intégralité des emojis Unicode (~3 700) avec recherche,
 * catégories, skin tones, locale FR. La data est chargée à la demande depuis
 * un CDN et mise en cache localStorage — première ouverture ~150 KB
 * compressés, ensuite c'est instantané.
 *
 * API identique à l'ancien picker : `<EmojiPicker onSelect={...}>{trigger}</EmojiPicker>`.
 */

interface EmojiPickerProps {
  /** Élément cliquable qui ouvre le picker. */
  children: React.ReactNode;
  /** Callback quand un emoji est sélectionné. */
  onSelect: (emoji: string) => void;
  /** Aligne le popover. Défaut: start. */
  align?: "start" | "center" | "end";
}

export function EmojiPicker({
  children,
  onSelect,
  align = "start",
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[340px] overflow-hidden p-0"
        sideOffset={8}
      >
        <FrimoussePicker.Root
          locale="fr"
          columns={9}
          onEmojiSelect={({ emoji }) => {
            onSelect(emoji);
            setOpen(false);
          }}
          className="isolate flex h-[360px] w-full flex-col bg-[var(--bg-popover-solid,var(--bg-elevated))]"
        >
          {/* Barre de recherche */}
          <FrimoussePicker.Search
            placeholder="Rechercher un emoji…"
            className="m-2 h-8 rounded-md border border-[var(--border-glass)] bg-[var(--bg-elevated)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none"
          />

          {/* Liste avec catégories collantes */}
          <FrimoussePicker.Viewport className="relative flex-1 outline-none">
            <FrimoussePicker.Loading className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-tertiary)]">
              Chargement…
            </FrimoussePicker.Loading>
            <FrimoussePicker.Empty className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-[var(--text-tertiary)]">
              Aucun emoji ne correspond
            </FrimoussePicker.Empty>
            <FrimoussePicker.List
              className="select-none pb-1"
              components={{
                CategoryHeader: ({ category, ...props }) => (
                  <div
                    {...props}
                    className="bg-[var(--bg-popover-solid,var(--bg-elevated))] px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                  >
                    {category.label}
                  </div>
                ),
                Row: ({ children, ...props }) => (
                  <div {...props} className="scroll-my-1 px-1">
                    {children}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    {...props}
                    className="flex size-8 items-center justify-center rounded-md text-xl transition-colors data-[active]:bg-[var(--bg-glass-hover)] data-[active]:ring-1 data-[active]:ring-[var(--accent)]/40 hover:bg-[var(--bg-glass-hover)]"
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </FrimoussePicker.Viewport>
        </FrimoussePicker.Root>
      </PopoverContent>
    </Popover>
  );
}
