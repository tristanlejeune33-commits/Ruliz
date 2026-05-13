"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, ImageOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SerializedProduit } from "./types";

interface ProduitsListProps {
  produits: SerializedProduit[];
  /** Catégorie parente · encodé dans data dnd pour le drop cross-catégorie. */
  categorieId: string;
  onEdit: (p: SerializedProduit) => void;
}

export function ProduitsList({ produits, categorieId, onEdit }: ProduitsListProps) {
  if (produits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Aucun produit dans cette catégorie.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Clique sur « Nouveau produit » pour commencer.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {produits.map((p) => (
        <ProduitItem
          key={p.id}
          produit={p}
          categorieId={categorieId}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}

function ProduitItem({
  produit,
  categorieId,
  onEdit,
}: {
  produit: SerializedProduit;
  categorieId: string;
  onEdit: (p: SerializedProduit) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: produit.id,
      data: { type: "product", categorieId },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 transition-colors duration-150 hover:border-[var(--text-muted)]",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
        className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-elevated)]">
        {produit.imageUrl ? (
          <Image
            src={produit.imageUrl}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          <ImageOff className="size-5 text-[var(--text-muted)]" />
        )}
      </div>
      <button
        type="button"
        onClick={() => onEdit(produit)}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
            {produit.titre}
          </span>
          {produit.estNouveau && (
            <Badge>
              <Sparkles className="size-3" /> Nouveau
            </Badge>
          )}
        </div>
        {produit.description && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {produit.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {produit.vignettes.map((v) => (
            <span
              key={v.vignetteId}
              className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
            >
              {v.vignette.labelFr}
            </span>
          ))}
          {produit.allergenes.length > 0 && (
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {produit.allergenes.length} allergène{produit.allergenes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1 pl-2">
        <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
          {produit.prix !== null ? `${produit.prix.toFixed(2)} ${produit.devise}` : "·"}
        </span>
        {produit.descriptionPrix && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {produit.descriptionPrix}
          </span>
        )}
      </div>
    </li>
  );
}
