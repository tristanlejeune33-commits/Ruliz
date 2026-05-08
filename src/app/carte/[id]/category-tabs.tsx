"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { PublicMenu } from "@/server/public/menu";
import type { CarteTheme } from "./theme";
import { withAlpha } from "./theme";

interface CategoryTabsProps {
  categories: PublicMenu["categories"];
  activeId: string | null;
  onSelect: (id: string) => void;
  theme: CarteTheme;
  /** Top offset (en px) sous lequel les tabs deviennent sticky. */
  stickyOffset?: number;
}

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
  theme,
  stickyOffset = 0,
}: CategoryTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll la tab active dans la vue
  useEffect(() => {
    if (!activeId) return;
    const btn = buttonRefs.current.get(activeId);
    const container = containerRef.current;
    if (!btn || !container) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    if (
      btnRect.left < containerRect.left ||
      btnRect.right > containerRect.right
    ) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  return (
    <nav
      className="sticky z-20 border-b backdrop-blur-md"
      style={{
        top: stickyOffset,
        background: withAlpha(theme.bg.startsWith("oklch") ? "#ffffff" : theme.bg, 0.85),
        borderColor: theme.border,
      }}
    >
      <div
        ref={containerRef}
        className="scrollbar-none flex gap-1 overflow-x-auto px-4 py-2 md:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeId;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                if (el) buttonRefs.current.set(cat.id, el);
                else buttonRefs.current.delete(cat.id);
              }}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="relative shrink-0 px-4 py-2 text-sm font-medium tracking-tight transition-colors duration-200"
              style={{
                color: isActive ? theme.accent : theme.textMuted,
                fontFamily: theme.fontDisplay,
              }}
            >
              <span className="flex items-center gap-1.5">
                {cat.titre}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
                  style={{
                    background: isActive
                      ? withAlpha(theme.accent, 0.15)
                      : withAlpha(theme.textMuted, 0.1),
                    color: isActive ? theme.accent : theme.textMuted,
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  {cat.produits.length}
                </span>
              </span>
              {isActive && (
                <motion.span
                  layoutId="active-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5"
                  style={{ background: theme.accent }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
