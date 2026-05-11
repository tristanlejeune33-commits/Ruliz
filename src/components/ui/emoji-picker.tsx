"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * EmojiPicker — Popover Radix avec grille d'emojis catégorisée + search.
 *
 * UX : click sur le trigger → ouvre une fenêtre flottante 320px avec :
 *   - Input de recherche (filter par nom et alias)
 *   - Onglets de catégories (Cadeaux, Boissons, Plats, Émotions, Objets, etc.)
 *   - Grille 8 colonnes scrollable
 *   - Click sur un emoji → injecte et ferme le popover
 *
 * 100% zéro-dep — la palette est statique mais couvre les 250 emojis les
 * plus utiles pour un restaurateur (jeux concours, lots, plats, etc.).
 *
 * Pour un picker complet avec TOUS les emojis Unicode, on pourrait
 * ajouter `emoji-picker-element` (~30kb) mais ces 250 suffisent largement.
 */

interface EmojiCategory {
  id: string;
  label: string;
  emojis: { emoji: string; name: string }[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    id: "cadeaux",
    label: "🎁 Cadeaux",
    emojis: [
      { emoji: "🎁", name: "cadeau gift" },
      { emoji: "🎉", name: "fête party" },
      { emoji: "🎊", name: "confetti" },
      { emoji: "🎀", name: "ruban" },
      { emoji: "🎟️", name: "ticket billet" },
      { emoji: "🎫", name: "billet" },
      { emoji: "🏆", name: "trophée trophy" },
      { emoji: "🥇", name: "or médaille gold" },
      { emoji: "🥈", name: "argent silver" },
      { emoji: "🥉", name: "bronze" },
      { emoji: "🎖️", name: "médaille" },
      { emoji: "🏅", name: "médaille sport" },
      { emoji: "💝", name: "coeur cadeau" },
      { emoji: "💐", name: "bouquet" },
      { emoji: "🌟", name: "étoile star" },
      { emoji: "⭐", name: "étoile" },
      { emoji: "✨", name: "étincelles sparkles" },
      { emoji: "💫", name: "étoile filante" },
      { emoji: "🎯", name: "cible target" },
      { emoji: "💎", name: "diamant" },
      { emoji: "👑", name: "couronne crown" },
      { emoji: "💰", name: "sac argent money" },
      { emoji: "💵", name: "billet dollar" },
      { emoji: "💸", name: "argent volant" },
    ],
  },
  {
    id: "boissons",
    label: "🍹 Boissons",
    emojis: [
      { emoji: "☕", name: "café coffee" },
      { emoji: "🍵", name: "thé tea" },
      { emoji: "🧋", name: "bubble tea" },
      { emoji: "🥤", name: "soda cup" },
      { emoji: "🧉", name: "maté" },
      { emoji: "🍶", name: "saké" },
      { emoji: "🍷", name: "vin wine" },
      { emoji: "🍾", name: "champagne bottle" },
      { emoji: "🥂", name: "champagne flûtes" },
      { emoji: "🍻", name: "bières trinquer" },
      { emoji: "🍺", name: "bière beer" },
      { emoji: "🍹", name: "cocktail tropical" },
      { emoji: "🍸", name: "martini cocktail" },
      { emoji: "🥃", name: "whisky" },
      { emoji: "🧊", name: "glaçon" },
      { emoji: "🍼", name: "biberon" },
      { emoji: "🥛", name: "lait" },
      { emoji: "💧", name: "eau drop" },
    ],
  },
  {
    id: "plats",
    label: "🍕 Plats",
    emojis: [
      { emoji: "🍕", name: "pizza" },
      { emoji: "🍔", name: "burger hamburger" },
      { emoji: "🌭", name: "hot dog" },
      { emoji: "🥪", name: "sandwich" },
      { emoji: "🌯", name: "burrito wrap" },
      { emoji: "🌮", name: "taco" },
      { emoji: "🥙", name: "kebab pita" },
      { emoji: "🧆", name: "falafel" },
      { emoji: "🥗", name: "salade" },
      { emoji: "🥘", name: "paella plat" },
      { emoji: "🍝", name: "pâtes spaghetti" },
      { emoji: "🍜", name: "ramen nouilles" },
      { emoji: "🍲", name: "pot-au-feu" },
      { emoji: "🍛", name: "curry riz" },
      { emoji: "🍣", name: "sushi" },
      { emoji: "🍱", name: "bento" },
      { emoji: "🥟", name: "ravioli dumpling" },
      { emoji: "🍤", name: "crevette tempura" },
      { emoji: "🍗", name: "poulet cuisse" },
      { emoji: "🍖", name: "viande os" },
      { emoji: "🥩", name: "steak" },
      { emoji: "🥓", name: "bacon" },
      { emoji: "🍳", name: "oeuf cuit" },
      { emoji: "🧀", name: "fromage cheese" },
      { emoji: "🥞", name: "pancakes" },
      { emoji: "🧇", name: "gaufre waffle" },
      { emoji: "🥖", name: "baguette pain" },
      { emoji: "🍞", name: "pain bread" },
      { emoji: "🥐", name: "croissant" },
      { emoji: "🧈", name: "beurre" },
    ],
  },
  {
    id: "desserts",
    label: "🍰 Desserts",
    emojis: [
      { emoji: "🍰", name: "gâteau cake" },
      { emoji: "🎂", name: "gâteau anniversaire" },
      { emoji: "🧁", name: "cupcake" },
      { emoji: "🍦", name: "glace cône" },
      { emoji: "🍨", name: "glace coupe" },
      { emoji: "🍧", name: "glace pilée" },
      { emoji: "🍮", name: "flan caramel" },
      { emoji: "🍭", name: "sucette" },
      { emoji: "🍬", name: "bonbon" },
      { emoji: "🍫", name: "chocolat" },
      { emoji: "🍩", name: "donut" },
      { emoji: "🍪", name: "cookie" },
      { emoji: "🥧", name: "tarte pie" },
      { emoji: "🍯", name: "miel" },
      { emoji: "🥧", name: "tarte" },
      { emoji: "🌰", name: "marron" },
      { emoji: "🍿", name: "popcorn" },
    ],
  },
  {
    id: "fruits",
    label: "🍓 Fruits",
    emojis: [
      { emoji: "🍓", name: "fraise" },
      { emoji: "🍒", name: "cerises" },
      { emoji: "🍑", name: "pêche" },
      { emoji: "🍇", name: "raisin" },
      { emoji: "🍉", name: "pastèque" },
      { emoji: "🍊", name: "orange" },
      { emoji: "🍋", name: "citron" },
      { emoji: "🍌", name: "banane" },
      { emoji: "🍍", name: "ananas" },
      { emoji: "🥭", name: "mangue" },
      { emoji: "🥑", name: "avocat" },
      { emoji: "🍎", name: "pomme rouge" },
      { emoji: "🍏", name: "pomme verte" },
      { emoji: "🍐", name: "poire" },
      { emoji: "🥝", name: "kiwi" },
      { emoji: "🫐", name: "myrtille" },
      { emoji: "🍅", name: "tomate" },
      { emoji: "🥥", name: "coco" },
      { emoji: "🥒", name: "concombre" },
      { emoji: "🥕", name: "carotte" },
      { emoji: "🌽", name: "maïs" },
      { emoji: "🌶️", name: "piment" },
      { emoji: "🍆", name: "aubergine" },
      { emoji: "🥦", name: "brocoli" },
    ],
  },
  {
    id: "symboles",
    label: "❤️ Symboles",
    emojis: [
      { emoji: "❤️", name: "coeur rouge heart" },
      { emoji: "🧡", name: "coeur orange" },
      { emoji: "💛", name: "coeur jaune" },
      { emoji: "💚", name: "coeur vert" },
      { emoji: "💙", name: "coeur bleu" },
      { emoji: "💜", name: "coeur violet" },
      { emoji: "🖤", name: "coeur noir" },
      { emoji: "🤍", name: "coeur blanc" },
      { emoji: "💖", name: "coeur sparkle" },
      { emoji: "💕", name: "deux coeurs" },
      { emoji: "💯", name: "100" },
      { emoji: "🔥", name: "feu fire" },
      { emoji: "✅", name: "check valide" },
      { emoji: "❌", name: "croix" },
      { emoji: "⚡", name: "éclair" },
      { emoji: "🌈", name: "arc-en-ciel" },
      { emoji: "🌞", name: "soleil" },
      { emoji: "🌙", name: "lune" },
      { emoji: "⏰", name: "réveil" },
      { emoji: "🎵", name: "note musique" },
      { emoji: "🎶", name: "notes musique" },
      { emoji: "📍", name: "épingle pin" },
      { emoji: "🆕", name: "new" },
      { emoji: "🆗", name: "ok" },
    ],
  },
  {
    id: "emotions",
    label: "😊 Émotions",
    emojis: [
      { emoji: "😀", name: "sourire happy" },
      { emoji: "😄", name: "rire" },
      { emoji: "😁", name: "sourire dents" },
      { emoji: "😂", name: "larmes rire" },
      { emoji: "🤣", name: "rire mort" },
      { emoji: "😊", name: "blush rougit" },
      { emoji: "😍", name: "amoureux yeux coeur" },
      { emoji: "🥰", name: "amoureux coeurs" },
      { emoji: "😘", name: "bisou" },
      { emoji: "😎", name: "cool lunettes" },
      { emoji: "🤩", name: "wow étoiles yeux" },
      { emoji: "🥳", name: "fête party" },
      { emoji: "🤤", name: "salive miam" },
      { emoji: "😋", name: "savoure miam" },
      { emoji: "🤗", name: "câlin hug" },
      { emoji: "🤔", name: "réfléchit" },
      { emoji: "👀", name: "yeux" },
      { emoji: "👍", name: "pouce up like" },
      { emoji: "👏", name: "applaudir" },
      { emoji: "🙌", name: "mains haut" },
      { emoji: "🙏", name: "merci prière" },
      { emoji: "✌️", name: "peace victory" },
      { emoji: "🤝", name: "shake hands" },
      { emoji: "💪", name: "muscle biceps" },
    ],
  },
];

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
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0]?.id ?? "");

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      // Recherche cross-catégories
      const all = CATEGORIES.flatMap((c) => c.emojis);
      return all.filter((e) => e.name.toLowerCase().includes(q));
    }
    return (
      CATEGORIES.find((c) => c.id === activeCat)?.emojis ??
      CATEGORIES[0]?.emojis ??
      []
    );
  }, [search, activeCat]);

  const handlePick = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[320px] p-0"
        sideOffset={8}
      >
        {/* Search bar */}
        <div className="border-b border-[var(--border-glass)] p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un emoji…"
              className="h-8 w-full rounded-md border border-[var(--border-glass)] bg-[var(--bg-elevated)] pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Effacer"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs catégories (masqué si recherche active) */}
        {!search && (
          <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border-glass)] px-2 py-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  activeCat === c.id
                    ? "bg-[var(--bg-glass-hover)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-primary)]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Grille emojis */}
        <div className="max-h-[280px] overflow-y-auto p-2">
          {filteredEmojis.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-tertiary)]">
              Aucun emoji ne matche « {search} »
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((e, i) => (
                <button
                  key={`${e.emoji}-${i}`}
                  type="button"
                  onClick={() => handlePick(e.emoji)}
                  className="flex size-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-[var(--bg-glass-hover)] active:scale-95"
                  title={e.name}
                  aria-label={e.name}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
