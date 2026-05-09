"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePreviewLang } from "@/components/shared/preview-lang-picker";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Eye, EyeOff, Plus, RefreshCcw, ScanText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  reorderCategories,
  reorderProduits,
} from "@/server/dashboard/menu-actions";
import { CategoriesSidebar } from "./categories-sidebar";
import { CategorieDrawer } from "./categorie-drawer";
import { ProduitsList } from "./produits-list";
import { ProduitDialog } from "./produit-dialog";
import type {
  SerializedAllergenes,
  SerializedCategorie,
  SerializedMenu,
  SerializedProduit,
  SerializedVignettes,
} from "./types";

interface MenuEditorProps {
  restaurantId: string;
  tree: SerializedMenu;
  vignettes: SerializedVignettes;
  allergenes: SerializedAllergenes;
}

export function MenuEditor({
  restaurantId,
  tree,
  vignettes,
  allergenes,
}: MenuEditorProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(true);
  const [activeCategorieId, setActiveCategorieId] = useState<string | null>(
    tree[0]?.id ?? null,
  );
  const [editingCategorie, setEditingCategorie] = useState<SerializedCategorie | "new" | null>(null);
  const [editingProduit, setEditingProduit] = useState<
    | { mode: "edit"; produit: SerializedProduit; categorieId: string }
    | { mode: "create"; categorieId: string }
    | null
  >(null);
  const [optimisticCategories, setOptimisticCategories] = useState(tree);
  const [lastSeenTree, setLastSeenTree] = useState(tree);
  const [, startTransition] = useTransition();

  // Compteur qui bump à chaque save → utilisé comme key de l'iframe pour
  // forcer un reload. Sans ça, router.refresh() ne reload PAS l'iframe (qui
  // a son propre lifecycle, indépendant des Server Components).
  const [previewKey, setPreviewKey] = useState(0);
  const refreshAll = () => {
    setPreviewKey((k) => k + 1);
    router.refresh();
  };

  // Langue de prévisualisation (pilotée par le picker dans la topbar)
  const [previewLang] = usePreviewLang();
  // Quand l'utilisateur change la langue dans la topbar, on force un reload
  // de l'iframe pour que la carte s'affiche dans la nouvelle langue.
  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [previewLang]);

  // Re-sync from server props when revalidatePath fires.
  // Official "storing information from previous renders" pattern.
  if (lastSeenTree !== tree) {
    setLastSeenTree(tree);
    setOptimisticCategories(tree);
    if (!activeCategorieId && tree[0]) {
      setActiveCategorieId(tree[0].id);
    }
  }

  const activeCategorie = useMemo(
    () => optimisticCategories.find((c) => c.id === activeCategorieId) ?? null,
    [activeCategorieId, optimisticCategories],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCategoriesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticCategories.findIndex((c) => c.id === active.id);
    const newIndex = optimisticCategories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = arrayMove(optimisticCategories, oldIndex, newIndex);
    setOptimisticCategories(newOrder);

    startTransition(async () => {
      const res = await reorderCategories({
        restaurantId,
        ids: newOrder.map((c) => c.id),
      });
      if (!res.ok) {
        toast.error(res.error);
        setOptimisticCategories(tree);
      }
    });
  };

  const handleProduitsDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !activeCategorie) return;

    const oldIndex = activeCategorie.produits.findIndex((p) => p.id === active.id);
    const newIndex = activeCategorie.produits.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newProduits = arrayMove(activeCategorie.produits, oldIndex, newIndex);
    setOptimisticCategories((prev) =>
      prev.map((c) =>
        c.id === activeCategorie.id ? { ...c, produits: newProduits } : c,
      ),
    );

    startTransition(async () => {
      const res = await reorderProduits({
        categorieId: activeCategorie.id,
        ids: newProduits.map((p) => p.id),
      });
      if (!res.ok) {
        toast.error(res.error);
        setOptimisticCategories(tree);
      }
    });
  };

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_minmax(0,420px)]">
      {/* Sidebar catégories */}
      <aside className="border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
        <div className="sticky top-14 flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Catégories
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              asChild
              aria-label="Importer depuis une photo"
              title="Importer ta carte depuis une photo"
            >
              <a href="/dashboard/menu/import">
                <ScanText className="size-3.5" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingCategorie("new")}
              aria-label="Nouvelle catégorie"
            >
              <Plus className="size-3.5" />
              Ajouter
            </Button>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoriesDragEnd}
        >
          <SortableContext
            items={optimisticCategories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <CategoriesSidebar
              categories={optimisticCategories}
              activeId={activeCategorieId}
              onSelect={setActiveCategorieId}
              onEdit={(c) => setEditingCategorie(c)}
            />
          </SortableContext>
        </DndContext>
      </aside>

      {/* Liste produits */}
      <section className="min-w-0">
        {activeCategorie ? (
          <div className="flex h-full flex-col">
            <div className="sticky top-14 flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 px-6 backdrop-blur">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{activeCategorie.titre}</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {activeCategorie.produits.length} produit
                  {activeCategorie.produits.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreview((s) => !s)}
                  className="hidden lg:inline-flex"
                  aria-label="Toggle preview"
                >
                  {showPreview ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  {showPreview ? "Masquer la preview" : "Afficher la preview"}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setEditingProduit({ mode: "create", categorieId: activeCategorie.id })
                  }
                >
                  <Plus className="size-3.5" />
                  Nouveau produit
                </Button>
              </div>
            </div>
            <div className="flex-1 px-6 py-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleProduitsDragEnd}
              >
                <SortableContext
                  items={activeCategorie.produits.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ProduitsList
                    produits={activeCategorie.produits}
                    onEdit={(p) =>
                      setEditingProduit({
                        mode: "edit",
                        produit: p,
                        categorieId: activeCategorie.id,
                      })
                    }
                  />
                </SortableContext>
              </DndContext>
            </div>
          </div>
        ) : (
          <EmptyState onCreate={() => setEditingCategorie("new")} />
        )}
      </section>

      {/* Preview live */}
      {showPreview && (
        <aside className="hidden border-l border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 lg:flex lg:flex-col">
          <div className="sticky top-14 flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Preview
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshAll}
              aria-label="Rafraîchir"
            >
              <RefreshCcw className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-hidden p-4">
            <div className="aspect-[9/19] w-full max-w-[320px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-xl">
              <iframe
                key={`${previewKey}-${previewLang}`}
                src={`/carte/${restaurantId}?preview=1&lang=${previewLang}&v=${previewKey}`}
                title="Preview carte publique"
                className="h-full w-full"
              />
            </div>
          </div>
        </aside>
      )}

      {/* Modals & drawers */}
      {editingCategorie !== null && (
        <CategorieDrawer
          restaurantId={restaurantId}
          categorie={editingCategorie === "new" ? null : editingCategorie}
          allCategories={optimisticCategories}
          onClose={() => setEditingCategorie(null)}
          onSaved={refreshAll}
        />
      )}

      {editingProduit && (
        <ProduitDialog
          mode={editingProduit.mode}
          categorieId={editingProduit.categorieId}
          categories={optimisticCategories}
          restaurantId={restaurantId}
          produit={editingProduit.mode === "edit" ? editingProduit.produit : null}
          vignettes={vignettes}
          allergenes={allergenes}
          onClose={() => setEditingProduit(null)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm text-[var(--text-muted)]">
        Aucune catégorie. Crée la première pour commencer ta carte.
      </p>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Créer une catégorie
      </Button>
    </div>
  );
}
