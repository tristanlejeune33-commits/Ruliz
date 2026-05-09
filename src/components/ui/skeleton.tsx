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

export { Skeleton, SkeletonLine, SkeletonCard, SkeletonRow };
