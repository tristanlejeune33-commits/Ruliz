import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--bg-elevated)]",
        className,
      )}
      {...props}
    />
  );
}

/** Helper : skeleton ligne de texte (h-4 par défaut) */
function SkeletonLine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4", className)} {...props} />;
}

/** Helper : skeleton carte avec header + 3 lignes */
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="h-8 w-1/2" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-3/4" />
    </div>
  );
}

/** Helper : skeleton ligne de table */
function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} className={i === 0 ? "w-32" : "flex-1"} />
      ))}
    </div>
  );
}

/* =============================================================================
 * Variants mobile-shaped — formes réalistes pour les listes mobile (cf. spec
 * docs/design-system-mobile.md §8 Skeleton).
 * ===========================================================================*/

/** Skeleton avatar circulaire (40px par défaut, override via size). */
function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <Skeleton
      className="shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

/** Item de liste mobile : avatar + 2 lignes texte + valeur droite, hauteur 72px. */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-card)] p-4">
      <SkeletonAvatar size={48} />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className="h-4 w-2/3" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
      <SkeletonLine className="h-5 w-12 shrink-0" />
    </div>
  );
}

/** KPI hero card mobile : label + grosse valeur + sparkline placeholder. */
function SkeletonKpiHero() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--bg-card)] p-5">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-10 w-32" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

/** Liste de N items mobile, prêt à drop dans une page. */
function SkeletonListMobile({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonLine,
  SkeletonCard,
  SkeletonRow,
  SkeletonAvatar,
  SkeletonListItem,
  SkeletonListMobile,
  SkeletonKpiHero,
};
