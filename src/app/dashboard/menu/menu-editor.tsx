"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutList,
  LayoutGrid,
  GalleryHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Smartphone,
  Sparkles,
} from "lucide-react";
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
  FlatCategorie,
  SerializedAllergenes,
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

/** Aplatit l'arbre catégorie + sous-catégories en une liste plate, parents puis enfants. */
function flattenCategories(tree: SerializedMenu): FlatCategorie[] {
  const out: FlatCategorie[] = [];
  for (const cat of tree) {
    out.push(cat);
    for (const child of cat.children) out.push(child);
  }
  return out;
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
  const [editingCategorie, setEditingCategorie] = useState<FlatCategorie | "new" | null>(null);
  const [editingProduit, setEditingProduit] = useState<
    | { mode: "edit"; produit: SerializedProduit; categorieId: string }
    | { mode: "create"; categorieId: string }
    | null
  >(null);
  const [optimisticCategories, setOptimisticCategories] = useState(tree);
  const [lastSeenTree, setLastSeenTree] = useState(tree);
  const [, startTransition] = useTransition();

  // Re-sync from server props when revalidatePath fires.
  // Official "storing information from previous renders" pattern.
  if (lastSeenTree !== tree) {
    setLastSeenTree(tree);
    setOptimisticCategories(tree);
    if (!activeCategorieId && tree[0]) {
      setActiveCategorieId(tree[0].id);
    }
  }

  const flatCategories = useMemo(
    () => flattenCategories(optimisticCategories),
    [optimisticCategories],
  );

  const activeCategorie = useMemo<FlatCategorie | null>(
    () => flatCategories.find((c) => c.id === activeCategorieId) ?? null,
    [activeCategorieId, flatCategories],
  );

  /** Catégorie parente de la cat active (si c'est une sous-cat). */
  const activeParent = useMemo(() => {
    if (!activeCategorie?.parentId) return null;
    return optimisticCategories.find((c) => c.id === activeCategorie.parentId) ?? null;
  }, [activeCategorie, optimisticCategories]);

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
    const targetId = activeCategorie.id;
    setOptimisticCategories((prev) =>
      prev.map((c) => {
        if (c.id === targetId) return { ...c, produits: newProduits };
        if (c.children.some((ch) => ch.id === targetId)) {
          return {
            ...c,
            children: c.children.map((ch) =>
              ch.id === targetId ? { ...ch, produits: newProduits } : ch,
            ),
          };
        }
        return c;
      }),
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
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_minmax(0,440px)]">
      {/* Sidebar catégories */}
      <aside className="flex min-h-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40">
        <div className="sticky top-14 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent)]">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Catégories
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingCategorie("new")}
            aria-label="Nouvelle catégorie"
            className="h-7 px-2"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
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
            {/* Topbar éditeur — breadcrumb + chips + actions */}
            <div className="sticky top-14 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  {/* Breadcrumb */}
                  <nav
                    aria-label="Fil d'ariane"
                    className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {activeParent ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveCategorieId(activeParent.id)}
                          className="truncate transition-colors hover:text-[var(--text-primary)]"
                        >
                          {activeParent.titre}
                        </button>
                        <ChevronRight className="size-3 shrink-0 text-[var(--text-muted)]/60" />
                        <span className="text-[var(--accent)]">
                          Sous-catégorie
                        </span>
                      </>
                    ) : (
                      <span>Catégorie principale</span>
                    )}
                  </nav>
                  {/* Titre + chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                      {activeCategorie.titre}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingCategorie(activeCategorie)}
                      className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                      aria-label="Éditer la catégorie"
                      title="Éditer la catégorie"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <CountChip count={activeCategorie.produits.length} />
                    <ModeChip mode={activeCategorie.modeAffichage} />
                    {!activeCategorie.affiche && (
                      <span
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-destructive)]"
                        title="Masquée sur la carte publique"
                      >
                        <EyeOff className="size-3" />
                        Masquée
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPreview((s) => !s)}
                    className="hidden lg:inline-flex"
                    aria-label="Toggle preview"
                    title={showPreview ? "Masquer la preview" : "Afficher la preview"}
                  >
                    {showPreview ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    <span className="hidden xl:inline">
                      {showPreview ? "Masquer" : "Preview"}
                    </span>
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
        <aside className="hidden border-l border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 lg:flex lg:flex-col">
          <div className="sticky top-14 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent)]">
                <Smartphone className="size-3.5" />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                Aperçu mobile
              </span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Live
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.refresh()}
                aria-label="Rafraîchir"
                title="Rafraîchir l'aperçu"
                className="h-7 px-2"
              >
                <RefreshCcw className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
                aria-label="Ouvrir dans un nouvel onglet"
                title="Ouvrir dans un nouvel onglet"
                className="h-7 px-2"
              >
                <a
                  href={`/carte/${restaurantId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-hidden p-4">
            <div className="aspect-[9/19] w-full max-w-[320px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-xl">
              <iframe
                src={`/carte/${restaurantId}?preview=1`}
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
          parents={optimisticCategories}
          onClose={() => setEditingCategorie(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {editingProduit && (
        <ProduitDialog
          mode={editingProduit.mode}
          categorieId={editingProduit.categorieId}
          categories={flatCategories}
          restaurantId={restaurantId}
          produit={editingProduit.mode === "edit" ? editingProduit.produit : null}
          vignettes={vignettes}
          allergenes={allergenes}
          onClose={() => setEditingProduit(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
        <Sparkles className="size-6 text-[var(--accent)]" />
      </div>
      <div className="relative max-w-sm space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Construis ta carte
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Crée ta première catégorie (Entrées, Plats, Boissons…) pour commencer
          à ajouter tes produits.
        </p>
      </div>
      <Button onClick={onCreate} className="relative">
        <Plus className="size-4" />
        Créer une catégorie
      </Button>
    </div>
  );
}

const MODE_LABELS: Record<string, { label: string; icon: typeof LayoutList }> = {
  liste: { label: "Liste", icon: LayoutList },
  grille: { label: "Grille", icon: LayoutGrid },
  carrousel: { label: "Carrousel", icon: GalleryHorizontal },
};

const FALLBACK_MODE = { label: "Liste", icon: LayoutList };

function ModeChip({ mode }: { mode: string }) {
  const config = MODE_LABELS[mode] ?? FALLBACK_MODE;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
      title={`Mode d'affichage : ${config.label}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

function CountChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
      <span className="font-mono tabular-nums text-[var(--text-primary)]">
        {count}
      </span>
      produit{count > 1 ? "s" : ""}
    </span>
  );
}
