"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setActiveRestaurant } from "@/server/dashboard/actions";

export interface RestaurantOption {
  id: string;
  name: string;
  ville?: string | null;
  plan: "freemium" | "pro" | "premium";
}

interface RestaurantSwitcherProps {
  restaurants: RestaurantOption[];
  activeId: string | null;
}

const PLAN_TONES: Record<RestaurantOption["plan"], string> = {
  freemium:
    "border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-tertiary)]",
  pro: "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  premium:
    "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
};

export function RestaurantSwitcher({
  restaurants,
  activeId,
}: RestaurantSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = restaurants.find((r) => r.id === activeId) ?? restaurants[0];

  if (!active) {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-dashed border-[var(--border-glass-hover)] bg-transparent px-3 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--neon-cyan)]/40 hover:text-[var(--text-primary)]"
      >
        <Plus className="size-4" strokeWidth={1.75} /> Ajouter un restaurant
      </button>
    );
  }

  const handleSelect = (id: string) => {
    if (id === active.id) return;
    startTransition(async () => {
      const res = await setActiveRestaurant(id);
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="group inline-flex h-9 max-w-[280px] items-center gap-2.5 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] px-2.5 text-left transition-all duration-200 hover:border-[var(--neon-cyan)]/30 hover:bg-[var(--bg-glass-hover)] disabled:opacity-60"
          aria-label="Changer de restaurant"
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
              "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-[var(--neon-cyan)]/30 group-hover:ring-[var(--neon-cyan)]/50",
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <UtensilsCrossed className="size-3.5" strokeWidth={1.75} />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              {active.name}
            </span>
            {active.ville && (
              <span className="hidden truncate text-[10px] text-[var(--text-tertiary)] sm:block">
                {active.ville}
              </span>
            )}
          </span>
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-primary)]"
            strokeWidth={1.75}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] p-1">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Mes restaurants
          <span className="font-mono text-[10px] normal-case tracking-normal text-[var(--text-secondary)]">
            {restaurants.length}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {restaurants.map((r) => {
          const isActive = r.id === active.id;
          return (
            <DropdownMenuItem
              key={r.id}
              onSelect={() => handleSelect(r.id)}
              className={cn(
                "gap-3 rounded-md py-2",
                isActive && "bg-[var(--bg-glass-hover)]",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                  isActive
                    ? "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-[var(--neon-cyan)]/30"
                    : "bg-[var(--bg-glass)] text-[var(--text-tertiary)] ring-[var(--border-glass)]",
                )}
              >
                <UtensilsCrossed className="size-3.5" strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {r.name}
                </span>
                {r.ville && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                    <MapPin className="size-2.5" strokeWidth={1.75} />
                    {r.ville}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider",
                  PLAN_TONES[r.plan],
                )}
              >
                {r.plan}
              </span>
              {isActive && (
                <Check
                  className="size-3.5 shrink-0 text-[var(--neon-cyan)]"
                  strokeWidth={2}
                />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 rounded-md text-[var(--neon-cyan)] data-[highlighted]:text-[var(--neon-cyan)]">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-cyan-soft)] ring-1 ring-[var(--neon-cyan)]/30">
            <Plus className="size-3.5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium">Ajouter un restaurant</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
