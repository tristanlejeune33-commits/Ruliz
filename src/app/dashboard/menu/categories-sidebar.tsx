"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownRight, Eye, EyeOff, GripVertical, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SerializedCategorie, SerializedMenu } from "./types";

interface CategoriesSidebarProps {
  categories: SerializedMenu;
  activeId: string | null;
  onSelect: (id: string) => void;
  onEdit: (categorie: SerializedCategorie) => void;
}

export function CategoriesSidebar({
  categories,
  activeId,
  onSelect,
  onEdit,
}: CategoriesSidebarProps) {
  return (
    <ul className="flex flex-col gap-1 px-2 py-2">
      {categories.length === 0 && (
        <li className="px-3 py-2 text-xs text-[var(--text-muted)]">
          Aucune catégorie.
        </li>
      )}
      {categories.map((categorie) => (
        <CategorieItem
          key={categorie.id}
          categorie={categorie}
          isActive={activeId === categorie.id}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}

function CategorieItem({
  categorie,
  isActive,
  onSelect,
  onEdit,
}: {
  categorie: SerializedCategorie;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (c: SerializedCategorie) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: categorie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sous-catégories imbriquées (children) — render après le parent, indentées
  const children = "children" in categorie ? categorie.children ?? [] : [];

  return (
    <li ref={setNodeRef} style={style} className="touch-none">
      {/* CATÉGORIE PARENTE — visuel navy/principal */}
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md border-l-[3px] transition-colors duration-150",
          isActive
            ? "border-[var(--accent)] bg-[var(--bg-card)] text-[var(--text-primary)]"
            : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        )}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Réordonner"
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSelect(categorie.id)}
          className="flex flex-1 items-center gap-2 px-1 py-1.5 text-left text-sm"
        >
          <span className="flex-1 truncate font-medium">{categorie.titre}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {categorie.produits.length}
          </span>
          {categorie.affiche ? null : (
            <EyeOff className="size-3 text-[var(--text-muted)]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onEdit(categorie)}
          className="flex size-7 shrink-0 items-center justify-center rounded text-[var(--text-muted)] opacity-0 hover:text-[var(--text-primary)] group-hover:opacity-100"
          aria-label="Éditer la catégorie"
        >
          <Pencil className="size-3" />
        </button>
      </div>

      {/* SOUS-CATÉGORIES — indentées, accent jaune (#ead04d) à gauche */}
      {children.length > 0 && (
        <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[#ead04d]/40 pl-2">
          {children.map((sub) => (
            <SubCategorieItem
              key={sub.id}
              sub={sub}
              isActive={activeId === sub.id}
              onSelect={onSelect}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SubCategorieItem({
  sub,
  isActive,
  onSelect,
  onEdit,
}: {
  sub: SerializedCategorie;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (c: SerializedCategorie) => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md transition-colors duration-150",
          isActive
            ? "bg-[#ead04d]/15 text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center text-[#ead04d]">
          <CornerDownRight className="size-3" />
        </span>
        <button
          type="button"
          onClick={() => onSelect(sub.id)}
          className="flex flex-1 items-center gap-2 py-1 pr-1 text-left text-[13px]"
        >
          <span className="flex-1 truncate">{sub.titre}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {sub.produits.length}
          </span>
          {sub.affiche ? null : (
            <EyeOff className="size-3 text-[var(--text-muted)]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onEdit(sub)}
          className="flex size-6 shrink-0 items-center justify-center rounded text-[var(--text-muted)] opacity-0 hover:text-[var(--text-primary)] group-hover:opacity-100"
          aria-label="Éditer la sous-catégorie"
        >
          <Pencil className="size-3" />
        </button>
      </div>
    </li>
  );
}

// Re-export pour clarity même si pas utilisé
export { Eye };
