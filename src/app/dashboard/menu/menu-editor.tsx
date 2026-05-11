"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePreviewLang } from "@/components/shared/preview-lang-picker";
import { PhoneFrame } from "@/components/shared/phone-frame";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
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
  ExternalLink,
  Eye,
  EyeOff,
  GalleryHorizontal,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  RefreshCcw,
  ScanText,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  moveCategorie,
  moveProduit,
  reorderCategories,
  reorderProduits,
} from "@/server/dashboard/menu-actions";
import { retranslateMenu } from "@/server/dashboard/translation-actions";
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
  // Mode mobile uniquement : "edit" (default) montre l'éditeur, "preview"
  // montre l'iframe full-width. Sur desktop, le toggle showPreview gère
  // la 3ème colonne — le mode mobile est ignoré (le SegmentedControl est lg:hidden).
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
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
  // Mémo des langues déjà déclenchées en re-traduction dans cette session
  // (évite de spammer l'API Anthropic à chaque clic répété sur la même lang).
  const [translatedLangs, setTranslatedLangs] = useState<Set<string>>(
    () => new Set(["fr"]),
  );
  // Quand l'utilisateur change la langue dans la topbar :
  //   1. On force un reload de l'iframe (key bump)
  //   2. Si la langue choisie n'a pas encore été traduite dans cette session
  //      ET n'est pas le FR (langue native), on déclenche une re-traduction
  //      silencieuse (force=false → skip ce qui est déjà traduit).
  //      Comme ça, la 1re fois qu'un user clique "EN" la traduction se génère,
  //      et les fois suivantes c'est instantané (cache DB).
  useEffect(() => {
    setPreviewKey((k) => k + 1);
    if (previewLang === "fr" || translatedLangs.has(previewLang)) return;

    const toastId = toast.loading(
      `Traduction en cours pour ${previewLang.toUpperCase()}…`,
    );
    setTranslatedLangs((prev) => new Set(prev).add(previewLang));

    retranslateMenu(restaurantId, [previewLang], false)
      .then((res) => {
        toast.dismiss(toastId);
        if (res.ok) {
          if (res.data?.mode === "inngest") {
            toast.success(
              `Traduction ${previewLang.toUpperCase()} en cours en arrière-plan`,
            );
          } else if (res.data?.produits != null) {
            const total = (res.data.produits ?? 0) + (res.data.categories ?? 0);
            if (total > 0) {
              toast.success(
                `${res.data.produits} produits, ${res.data.categories} catégories traduits en ${previewLang.toUpperCase()}`,
              );
            }
          }
          // Bump l'iframe une 2e fois pour afficher le contenu traduit
          setPreviewKey((k) => k + 1);
        } else {
          toast.error(res.error);
          // Permet de re-tenter sur prochain clic
          setTranslatedLangs((prev) => {
            const next = new Set(prev);
            next.delete(previewLang);
            return next;
          });
        }
      })
      .catch((err) => {
        toast.dismiss(toastId);
        console.warn("[preview-lang] retranslate failed:", err);
        setTranslatedLangs((prev) => {
          const next = new Set(prev);
          next.delete(previewLang);
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * Liste plate de toutes les catégories (top-level + sous-catégories).
   * Utilisée pour `find()` (sinon les sous-cats ne sont jamais trouvées →
   * on tombait sur l'EmptyState quand on cliquait une sous-cat dans la sidebar)
   * et pour le select catégorie du dialog produit (pour pouvoir assigner un
   * produit directement à une sous-catégorie).
   */
  const flatCategories = useMemo(() => {
    const out: SerializedCategorie[] = [];
    for (const cat of optimisticCategories) {
      out.push(cat);
      const children =
        ((cat as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
      for (const child of children) out.push(child);
    }
    return out;
  }, [optimisticCategories]);

  const activeCategorie = useMemo(
    () => flatCategories.find((c) => c.id === activeCategorieId) ?? null,
    [activeCategorieId, flatCategories],
  );

  /** Catégorie parente de la cat active (si c'est une sous-cat). Sert au breadcrumb du topbar. */
  const activeParent = useMemo(() => {
    if (!activeCategorie?.parentId) return null;
    return optimisticCategories.find((c) => c.id === activeCategorie.parentId) ?? null;
  }, [activeCategorie, optimisticCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Custom collision detection — résout le bug "drag produit vers sidebar
   * ne détecte pas la cat" :
   * - closestCenter compare le CENTRE du draggable au centre des droppables.
   *   Quand on drag un produit (large) vers une cat (sidebar étroite), le
   *   centre du produit reste loin → la cat n'est jamais "over".
   * - On utilise pointerWithin (cursor position) en priorité, puis
   *   rectIntersection en fallback, et finalement closestCenter pour le cas
   *   où rien d'autre ne match. Standard pour les multi-context dnd-kit.
   */
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCenter(args);
  };

  // ----------------------------------------------------------------------
  // Helpers state — opérations sur l'arbre (top-level + sub-cats)
  // ----------------------------------------------------------------------

  /** Met à jour les produits d'une catégorie (top-level OU sub-cat). */
  const updateProduitsInCat = (
    catId: string,
    updater: (produits: SerializedProduit[]) => SerializedProduit[],
  ) => {
    setOptimisticCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) return { ...c, produits: updater(c.produits) };
        const children =
          ((c as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
        if (children.some((ch) => ch.id === catId)) {
          return {
            ...c,
            children: children.map((ch) =>
              ch.id === catId ? { ...ch, produits: updater(ch.produits) } : ch,
            ),
          } as SerializedCategorie;
        }
        return c;
      }),
    );
  };

  /** Trouve une cat par id (top-level OU sub-cat). */
  const findCatById = (catId: string): SerializedCategorie | null => {
    for (const c of optimisticCategories) {
      if (c.id === catId) return c;
      const children =
        ((c as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
      const found = children.find((ch) => ch.id === catId);
      if (found) return found;
    }
    return null;
  };

  /**
   * Déplace une sous-catégorie vers un nouveau parent (top-level cat).
   * Optimistic UI : on retire la sub-cat de son parent actuel, et on
   * l'ajoute au nouveau parent (avec ses produits).
   * Server : moveCategorie(catId, toParentId).
   */
  const migrateSubCatToParent = (subCatId: string, toParentId: string) => {
    // Trouve la sub-cat à déplacer
    let movedSubCat: SerializedCategorie | null = null;
    let oldParentId: string | null = null;
    for (const c of optimisticCategories) {
      const children =
        ((c as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
      const found = children.find((ch) => ch.id === subCatId);
      if (found) {
        movedSubCat = found;
        oldParentId = c.id;
        break;
      }
    }
    if (!movedSubCat || !oldParentId) return;
    if (oldParentId === toParentId) return; // déjà dans ce parent
    if (subCatId === toParentId) return; // self

    // Vérifie que la cible est bien un top-level (pas une sub-cat)
    const targetParent = optimisticCategories.find((c) => c.id === toParentId);
    if (!targetParent) return;

    // Optimistic UI : retire de l'ancien parent, ajoute au nouveau
    const updatedSubCat = {
      ...movedSubCat,
      parentId: toParentId,
    } as SerializedCategorie;

    setOptimisticCategories((prev) =>
      prev.map((c) => {
        if (c.id === oldParentId) {
          const children =
            ((c as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
          return {
            ...c,
            children: children.filter((ch) => ch.id !== subCatId),
          } as SerializedCategorie;
        }
        if (c.id === toParentId) {
          const children =
            ((c as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
          return {
            ...c,
            children: [...children, updatedSubCat],
          } as SerializedCategorie;
        }
        return c;
      }),
    );

    const targetTitre = targetParent.titre;
    startTransition(async () => {
      const res = await moveCategorie({
        categorieId: subCatId,
        toParentId,
      });
      if (res.ok) {
        toast.success(`Sous-catégorie déplacée dans « ${targetTitre} »`);
      } else {
        toast.error(res.error);
        setOptimisticCategories(tree);
      }
    });
  };

  // ----------------------------------------------------------------------
  // Handler unifié drag&drop — dispatch par type via active.data.current.type
  // ----------------------------------------------------------------------

  /**
   * Cas gérés :
   * 1. cat → cat (top-level)         → reorder top-level
   * 2. sub-cat → sub-cat (siblings)  → reorder children dans le même parent
   * 3. product → product même cat    → reorder produits
   * 4. product → product autre cat   → moveProduit + position au drop
   * 5. product → cat ou sub-cat      → moveProduit en append
   */
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeType = active.data.current?.type as
      | "category"
      | "subcategory"
      | "product"
      | undefined;
    const overType = over.data.current?.type as
      | "category"
      | "subcategory"
      | "product"
      | undefined;

    // === CAT → CAT (top-level) ===
    if (activeType === "category" && overType === "category") {
      const oldIndex = optimisticCategories.findIndex((c) => c.id === activeId);
      const newIndex = optimisticCategories.findIndex((c) => c.id === overId);
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
      return;
    }

    // === SUB-CAT → ... ===
    if (activeType === "subcategory") {
      const activeParentId = active.data.current?.parentId as string | undefined;
      if (!activeParentId) return;

      // Cas A : sub-cat → sub-cat même parent → reorder dans la liste enfants
      if (overType === "subcategory") {
        const overParentId = over.data.current?.parentId as string | undefined;

        if (activeParentId === overParentId) {
          // Reorder siblings
          const parentIndex = optimisticCategories.findIndex(
            (c) => c.id === activeParentId,
          );
          if (parentIndex < 0) return;
          const parent = optimisticCategories[parentIndex];
          if (!parent) return;
          const children =
            ((parent as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
          const oldIdx = children.findIndex((ch) => ch.id === activeId);
          const newIdx = children.findIndex((ch) => ch.id === overId);
          if (oldIdx < 0 || newIdx < 0) return;

          const newChildren = arrayMove(children, oldIdx, newIdx);
          setOptimisticCategories((prev) =>
            prev.map((c, idx) =>
              idx === parentIndex
                ? ({ ...c, children: newChildren } as SerializedCategorie)
                : c,
            ),
          );
          startTransition(async () => {
            const res = await reorderCategories({
              restaurantId,
              ids: newChildren.map((ch) => ch.id),
            });
            if (!res.ok) {
              toast.error(res.error);
              setOptimisticCategories(tree);
            }
          });
          return;
        }

        // Sub-cat → sub-cat avec parent différent → migre vers le parent du over
        if (overParentId) {
          migrateSubCatToParent(activeId, overParentId);
          return;
        }
        return;
      }

      // Cas B : sub-cat → catégorie top-level → migre vers cette nouvelle parente
      if (overType === "category") {
        migrateSubCatToParent(activeId, overId);
        return;
      }
      return;
    }

    // === PRODUCT → ... ===
    if (activeType === "product") {
      const fromCatId = active.data.current?.categorieId as string | undefined;
      if (!fromCatId) return;

      // Détermine la catégorie de destination
      let toCatId: string;
      if (overType === "product") {
        toCatId = (over.data.current?.categorieId as string | undefined) ?? fromCatId;
      } else if (overType === "category" || overType === "subcategory") {
        toCatId = overId;
      } else {
        return;
      }

      // Cas A : reorder dans la même catégorie
      if (fromCatId === toCatId && overType === "product") {
        const cat = findCatById(fromCatId);
        if (!cat) return;
        const oldIdx = cat.produits.findIndex((p) => p.id === activeId);
        const newIdx = cat.produits.findIndex((p) => p.id === overId);
        if (oldIdx < 0 || newIdx < 0) return;

        const newProduits = arrayMove(cat.produits, oldIdx, newIdx);
        updateProduitsInCat(fromCatId, () => newProduits);
        startTransition(async () => {
          const res = await reorderProduits({
            categorieId: fromCatId,
            ids: newProduits.map((p) => p.id),
          });
          if (!res.ok) {
            toast.error(res.error);
            setOptimisticCategories(tree);
          }
        });
        return;
      }

      // Cas B : déplacement vers une autre catégorie
      const fromCat = findCatById(fromCatId);
      const toCat = findCatById(toCatId);
      if (!fromCat || !toCat) return;
      const movedProduit = fromCat.produits.find((p) => p.id === activeId);
      if (!movedProduit) return;

      // Optimistic UI : on retire de l'ancienne cat et on append à la nouvelle
      updateProduitsInCat(fromCatId, (produits) =>
        produits.filter((p) => p.id !== activeId),
      );
      updateProduitsInCat(toCatId, (produits) => [...produits, movedProduit]);

      const targetCatTitre = toCat.titre;
      startTransition(async () => {
        const res = await moveProduit({
          produitId: activeId,
          toCategorieId: toCatId,
        });
        if (res.ok) {
          toast.success(`Produit déplacé vers « ${targetCatTitre} »`);
        } else {
          toast.error(res.error);
          setOptimisticCategories(tree);
        }
      });
      return;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragEnd={handleDragEnd}
    >
      {/* Toggle mobile-only Édition / Aperçu — caché desktop (la 3ème colonne
          de preview prend le relais). Empilé avec le mode preview qui swap
          le contenu entre éditeur (sidebar+produits) et iframe full-width. */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 px-4 py-2 lg:hidden">
        <SegmentedControl<"edit" | "preview">
          value={mobileView}
          onChange={setMobileView}
          options={[
            {
              value: "edit",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Pencil className="size-3.5" strokeWidth={1.75} />
                  Édition
                </span>
              ),
            },
            {
              value: "preview",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="size-3.5" strokeWidth={1.75} />
                  Aperçu
                </span>
              ),
            },
          ]}
          size="compact"
          className="w-full"
          ariaLabel="Mode éditeur mobile"
        />
      </div>

      {/* Aperçu mobile full-width — visible seulement en mode "preview" sous lg.
          Sur desktop l'iframe est dans la 3ème colonne (cf. plus bas). */}
      {mobileView === "preview" && (
        <section className="flex flex-1 flex-col items-center justify-start bg-[var(--bg-elevated)]/40 p-4 lg:hidden">
          <div className="mb-3 flex w-full items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Smartphone className="size-3.5" strokeWidth={1.75} />
              Aperçu live
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshAll}
                aria-label="Rafraîchir l'aperçu"
                className="h-8 px-2"
              >
                <RefreshCcw className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
                aria-label="Ouvrir dans un nouvel onglet"
                className="h-8 px-2"
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
          <PhoneFrame
            src={`/carte/${restaurantId}?preview=1&lang=${previewLang}&v=${previewKey}`}
            title="Aperçu de la carte publique"
            reloadKey={`mobile-${previewKey}-${previewLang}`}
            maxWidth={380}
            dataAttrs={{ "data-onboarding-anchor": "preview-iframe" }}
          />
        </section>
      )}

      <div
        className={`grid flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_minmax(0,420px)] ${
          mobileView === "preview" ? "hidden lg:grid" : ""
        }`}
      >
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
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                asChild
                aria-label="Importer depuis une photo"
                title="Importer ta carte depuis une photo"
                className="h-7 px-2"
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
                className="h-7 px-2"
                data-onboarding-anchor="add-category"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </div>
          </div>
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
                        <span className="text-[#ead04d]">Sous-catégorie</span>
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
                    aria-label="Afficher ou masquer l'aperçu"
                    title={showPreview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
                  >
                    {showPreview ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    <span className="hidden xl:inline">
                      {showPreview ? "Masquer" : "Aperçu"}
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
              <SortableContext
                items={activeCategorie.produits.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <ProduitsList
                  produits={activeCategorie.produits}
                  categorieId={activeCategorie.id}
                  onEdit={(p) =>
                    setEditingProduit({
                      mode: "edit",
                      produit: p,
                      categorieId: activeCategorie.id,
                    })
                  }
                />
              </SortableContext>
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
                onClick={refreshAll}
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
            <PhoneFrame
              src={`/carte/${restaurantId}?preview=1&lang=${previewLang}&v=${previewKey}`}
              title="Aperçu de la carte publique"
              reloadKey={`${previewKey}-${previewLang}`}
              maxWidth={320}
            />
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
    </DndContext>
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

const FALLBACK_MODE = { label: "Liste", icon: LayoutList };

const MODE_LABELS: Record<string, { label: string; icon: typeof LayoutList }> = {
  liste: { label: "Liste", icon: LayoutList },
  grille: { label: "Grille", icon: LayoutGrid },
  carrousel: { label: "Carrousel", icon: GalleryHorizontal },
};

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
