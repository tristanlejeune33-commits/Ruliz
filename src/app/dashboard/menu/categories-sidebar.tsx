"use client";

import { useMemo, useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CornerDownRight,
  EyeOff,
  FolderTree,
  GripVertical,
  Inbox,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FlatCategorie,
  SerializedCategorie,
  SerializedMenu,
} from "./types";

interface CategoriesSidebarProps {
  categories: SerializedMenu;
  activeId: string | null;
  onSelect: (id: string) => void;
  onEdit: (categorie: FlatCategorie) => void;
}

export function CategoriesSidebar({
  categories,
  activeId,
  onSelect,
  onEdit,
}: CategoriesSidebarProps) {
  const [query, setQuery] = useState("");

  const totalCats = useMemo(
    () =>
      categories.reduce((sum, c) => sum + 1 + c.children.length, 0),
    [categories],
  );

  const totalProduits = useMemo(
    () =>
      categories.reduce(
        (sum, c) =>
          sum +
          c.produits.length +
          c.children.reduce((s, ch) => s + ch.produits.length, 0),
        0,
      ),
    [categories],
  );

  // Filtrage : on garde une cat parente si elle matche OU si l'un de ses
  // enfants matche, et on filtre les enfants à l'affichage.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => {
        const parentMatch = c.titre.toLowerCase().includes(q);
        const matchingChildren = c.children.filter((ch) =>
          ch.titre.toLowerCase().includes(q),
        );
        if (parentMatch) return c;
        if (matchingChildren.length > 0) return { ...c, children: matchingChildren };
        return null;
      })
      .filter((c): c is SerializedCategorie => c !== null);
  }, [categories, query]);

  const isEmpty = categories.length === 0;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Stats compteur */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          <FolderTree className="size-3" />
          <span className="tabular-nums text-[var(--text-secondary)]">
            {totalCats}
          </span>
          <span>cat.</span>
          <span aria-hidden className="text-[var(--text-muted)]/50">·</span>
          <span className="tabular-nums text-[var(--text-secondary)]">
            {totalProduits}
          </span>
          <span>produits</span>
        </div>
      </div>

      {/* Barre de recherche */}
      {!isEmpty && (
        <div className="relative px-3 py-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une catégorie…"
            className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 py-1.5 pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              aria-label="Effacer la recherche"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyHint />
        ) : isFilteredEmpty ? (
          <NoResultsHint query={query} />
        ) : (
          <ul className="flex flex-col gap-0.5 px-2 pt-1 pb-3">
            {filtered.map((categorie) => (
              <CategorieItem
                key={categorie.id}
                categorie={categorie}
                activeId={activeId}
                onSelect={onSelect}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EmptyHint() {
  return (
    <div className="m-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]/30 p-6 text-center">
      <Inbox className="size-6 text-[var(--text-muted)]" />
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        Aucune catégorie
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
        Crée la première pour structurer ta carte.
      </p>
    </div>
  );
}

function NoResultsHint({ query }: { query: string }) {
  return (
    <div className="m-3 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]/30 p-4 text-center">
      <p className="text-xs text-[var(--text-secondary)]">
        Aucun résultat pour
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-primary)]">
        « {query} »
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CategorieItem({
  categorie,
  activeId,
  onSelect,
  onEdit,
}: {
  categorie: SerializedCategorie;
  activeId: string | null;
  onSelect: (id: string) => void;
  onEdit: (c: FlatCategorie) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: categorie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const totalProduits =
    categorie.produits.length +
    categorie.children.reduce((sum, c) => sum + c.produits.length, 0);

  const hasChildren = categorie.children.length > 0;
  const isActive = activeId === categorie.id;
  const childActive = categorie.children.some((c) => c.id === activeId);

  return (
    <li ref={setNodeRef} style={style} className="touch-none">
      <CategorieRow
        titre={categorie.titre}
        produitCount={totalProduits}
        affiche={categorie.affiche}
        isActive={isActive}
        isHighlightedAncestor={!isActive && childActive}
        badge={hasChildren ? `${categorie.children.length}` : undefined}
        onSelect={() => onSelect(categorie.id)}
        onEdit={() => onEdit(categorie)}
        dragHandle={{ attributes, listeners }}
      />
      {hasChildren && (
        <ul
          role="group"
          aria-label={`Sous-catégories de ${categorie.titre}`}
          className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--border-subtle)]/70 pl-1"
        >
          {categorie.children.map((child) => (
            <li key={child.id}>
              <CategorieRow
                titre={child.titre}
                produitCount={child.produits.length}
                affiche={child.affiche}
                isActive={activeId === child.id}
                isChild
                onSelect={() => onSelect(child.id)}
                onEdit={() => onEdit(child)}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------

function CategorieRow({
  titre,
  produitCount,
  affiche,
  isActive,
  isHighlightedAncestor = false,
  isChild = false,
  badge,
  onSelect,
  onEdit,
  dragHandle,
}: {
  titre: string;
  produitCount: number;
  affiche: boolean;
  isActive: boolean;
  isHighlightedAncestor?: boolean;
  isChild?: boolean;
  badge?: string;
  onSelect: () => void;
  onEdit: () => void;
  dragHandle?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-md transition-all duration-150",
        isActive
          ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
          : isHighlightedAncestor
            ? "bg-[var(--bg-elevated)]/60 text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]",
      )}
    >
      {/* Barre verticale d'accent quand actif */}
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-[var(--accent)]"
        />
      )}

      {dragHandle ? (
        <button
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          aria-label="Réordonner"
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : (
        <span
          className="flex size-7 shrink-0 items-center justify-center text-[var(--text-muted)]/40"
          aria-hidden
        >
          <CornerDownRight className="size-3" />
        </span>
      )}

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex flex-1 min-w-0 items-center gap-2 px-1 py-1.5 text-left",
          isChild ? "text-[13px]" : "text-sm",
        )}
      >
        <span
          className={cn(
            "flex-1 truncate",
            isActive && "font-medium",
            !affiche && "italic text-[var(--text-muted)]",
          )}
        >
          {titre}
        </span>
        {!affiche && (
          <span
            className="inline-flex items-center justify-center text-[var(--text-muted)]"
            aria-label="Masquée"
            title="Masquée sur la carte publique"
          >
            <EyeOff className="size-3" />
          </span>
        )}
        {badge && (
          <span
            className={cn(
              "rounded-full border px-1.5 py-0 text-[9px] font-mono uppercase tracking-wider",
              isActive
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 text-[var(--text-muted)]",
            )}
            title={`${badge} sous-catégories`}
          >
            {badge}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 font-mono text-[10px] tabular-nums",
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
          )}
        >
          {produitCount}
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex size-7 shrink-0 items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] group-hover:opacity-100 focus:opacity-100"
        aria-label="Éditer la catégorie"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  );
}
