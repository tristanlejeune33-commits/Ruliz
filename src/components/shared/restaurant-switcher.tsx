"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

export function RestaurantSwitcher({
  restaurants,
  activeId,
}: RestaurantSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = restaurants.find((r) => r.id === activeId) ?? restaurants[0];

  if (!active) {
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Plus className="size-4" /> Ajouter un restaurant
      </Button>
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
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[260px] justify-between gap-2"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin text-[var(--text-muted)]" />
          ) : (
            <UtensilsCrossed className="size-4 text-[var(--accent)]" />
          )}
          <span className="flex-1 truncate text-left">{active.name}</span>
          <ChevronsUpDown className="size-3.5 text-[var(--text-muted)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Mes restaurants</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {restaurants.map((r) => {
          const isActive = r.id === active.id;
          return (
            <DropdownMenuItem
              key={r.id}
              onSelect={() => handleSelect(r.id)}
              className="gap-3"
            >
              <UtensilsCrossed
                className={cn(
                  "size-4",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                )}
              />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {r.name}
                </span>
                {r.ville && (
                  <span className="text-xs text-[var(--text-muted)]">{r.ville}</span>
                )}
              </div>
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                {r.plan}
              </span>
              {isActive && <Check className="size-4 text-[var(--accent)]" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[var(--accent)] data-[highlighted]:text-[var(--accent)]">
          <Plus /> Ajouter un restaurant
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
