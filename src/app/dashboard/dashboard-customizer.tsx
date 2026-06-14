"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  saveDashboardLayout,
  type DashboardLayout,
} from "@/server/dashboard/dashboard-layout-actions";

export interface DashboardSection {
  id: string;
  label: string;
  node: React.ReactNode;
}

/**
 * Enveloppe l'accueil dashboard d'un mode « Personnaliser » : l'utilisateur
 * peut réordonner les sections (drag) et masquer celles qu'il n'utilise pas.
 * L'état est persisté par utilisateur (User.dashboardLayout) et appliqué de
 * façon optimiste — la sauvegarde réseau ne bloque jamais l'UI.
 *
 * Les sections sont des slots opaques (ReactNode rendus côté serveur) : ce
 * composant ne touche QUE l'ordre et la visibilité, jamais leur contenu.
 */
export function DashboardCustomizer({
  sections,
  initialLayout,
}: {
  sections: DashboardSection[];
  initialLayout: DashboardLayout | null;
}) {
  const allIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Ordre effectif : ids sauvegardés (filtrés à ceux qui existent encore) puis
  // toute nouvelle section non connue, ajoutée à la fin.
  const [order, setOrder] = useState<string[]>(() => {
    const saved = (initialLayout?.order ?? []).filter((id) =>
      allIds.includes(id),
    );
    const missing = allIds.filter((id) => !saved.includes(id));
    return [...saved, ...missing];
  });
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(initialLayout?.hidden ?? []),
  );
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const byId = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  );

  const persist = (nextOrder: string[], nextHidden: Set<string>) => {
    startTransition(async () => {
      await saveDashboardLayout({
        order: nextOrder,
        hidden: Array.from(nextHidden),
      }).catch(() => null);
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(String(active.id));
      const to = prev.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      const next = arrayMove(prev, from, to);
      persist(next, hidden);
      return next;
    });
  };

  const toggleHidden = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(order, next);
      return next;
    });
  };

  const reset = () => {
    setOrder(allIds);
    setHidden(new Set());
    persist(allIds, new Set());
    toast.success("Disposition réinitialisée");
  };

  const orderedSections = order
    .map((id) => byId.get(id))
    .filter((s): s is DashboardSection => Boolean(s));

  // ── Mode lecture : on rend simplement les sections visibles dans l'ordre ──
  if (!editing) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <Settings2 className="size-3.5" strokeWidth={1.75} />
            Personnaliser
          </Button>
        </div>
        {orderedSections
          .filter((s) => !hidden.has(s.id))
          .map((s) => (
            <div key={s.id}>{s.node}</div>
          ))}
      </div>
    );
  }

  // ── Mode édition : barre d'aide + sections draggables avec toggle œil ──
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Glisse pour réordonner, masque ce que tu n&apos;utilises pas.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={() => setEditing(false)}>
            <Check className="size-3.5" strokeWidth={2} />
            Terminer
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-6 md:space-y-8">
            {orderedSections.map((s) => (
              <SortableSection
                key={s.id}
                id={s.id}
                label={s.label}
                hidden={hidden.has(s.id)}
                onToggle={() => toggleHidden(s.id)}
              >
                {s.node}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSection({
  id,
  label,
  hidden,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  hidden: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative rounded-2xl ring-1 ring-dashed ring-[var(--border-glass)] transition",
        isDragging && "z-10 opacity-80 shadow-xl",
      )}
    >
      {/* Barre de contrôle de la section (édition) */}
      <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-2">
        <button
          type="button"
          className="flex cursor-grab items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer ${label}`}
        >
          <GripVertical className="size-4" strokeWidth={1.75} />
          {label}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onToggle}
          aria-label={hidden ? `Afficher ${label}` : `Masquer ${label}`}
        >
          {hidden ? (
            <EyeOff className="size-4 text-[var(--text-tertiary)]" />
          ) : (
            <Eye className="size-4 text-[var(--accent)]" />
          )}
        </Button>
      </div>
      {/* La section elle-même, grisée si masquée */}
      <div className={cn("p-1", hidden && "pointer-events-none opacity-35")}>
        {children}
      </div>
    </div>
  );
}
