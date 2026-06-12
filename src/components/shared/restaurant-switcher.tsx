"use client";

import { useState, useTransition } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createFirstRestaurant,
  setActiveRestaurant,
} from "@/server/dashboard/actions";

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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const active = restaurants.find((r) => r.id === activeId) ?? restaurants[0];

  if (!active) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-dashed border-[var(--border-glass-hover)] bg-transparent px-3 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--neon-cyan)]/40 hover:text-[var(--text-primary)]"
        >
          <Plus className="size-4" strokeWidth={1.75} /> Ajouter un restaurant
        </button>
        <AddRestaurantDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
        />
      </>
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
    <>
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
        <DropdownMenuItem
          // setTimeout 0 : laisse le dropdown finir sa fermeture (restore
          // focus, cleanup pointer-events sur body) AVANT d'ouvrir le
          // dialog. Sans ça, Radix peut fermer le dialog immédiatement ou
          // laisser body en pointer-events:none (UI gelée).
          onSelect={() => setTimeout(() => setAddDialogOpen(true), 0)}
          className="gap-2 rounded-md text-[var(--neon-cyan)] data-[highlighted]:text-[var(--neon-cyan)]"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-cyan-soft)] ring-1 ring-[var(--neon-cyan)]/30">
            <Plus className="size-3.5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium">Ajouter un restaurant</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AddRestaurantDialog
      open={addDialogOpen}
      onOpenChange={setAddDialogOpen}
    />
    </>
  );
}

/**
 * Dialog de création d'un restaurant supplémentaire.
 *
 * Réutilise la server action `createFirstRestaurant` (malgré son nom, elle
 * gère les restaurants suivants : `canCreateRestaurant` applique la limite
 * du plan et retourne une erreur explicite si elle est atteinte).
 *
 * Après création : bascule le restaurant actif sur le nouveau + refresh
 * pour que tout le dashboard (sidebar, KPIs, éditeur) pointe dessus.
 */
function AddRestaurantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");

  const handleCreate = () => {
    const trimmed = nom.trim();
    if (!trimmed) {
      toast.error("Donne un nom à ton restaurant.");
      return;
    }
    startTransition(async () => {
      const res = await createFirstRestaurant({
        nom: trimmed,
        ville: ville.trim(),
        email: "",
        telephone: "",
      });
      if (!res.ok) {
        // Limite de plan atteinte ou autre erreur → message explicite
        toast.error(res.error);
        return;
      }
      if (!res.data?.id) {
        toast.error("Création réussie mais ID manquant. Recharge la page.");
        router.refresh();
        return;
      }
      // Bascule sur le nouveau resto immédiatement
      const switched = await setActiveRestaurant(res.data.id);
      if (!switched.ok) {
        toast.error(switched.error);
      }
      toast.success(`Restaurant « ${trimmed} » créé !`);
      setNom("");
      setVille("");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un restaurant</DialogTitle>
          <DialogDescription>
            Chaque restaurant a sa propre carte, ses QR codes et ses stats.
            Tu pourras basculer entre eux depuis ce menu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-resto-nom">Nom du restaurant *</Label>
            <Input
              id="new-resto-nom"
              autoFocus
              placeholder="La Table d'à côté"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-resto-ville">Ville (optionnel)</Label>
            <Input
              id="new-resto-ville"
              placeholder="Bordeaux"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              maxLength={100}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={pending || !nom.trim()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
