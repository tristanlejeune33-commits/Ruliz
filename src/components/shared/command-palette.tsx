"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  scope?: "admin" | "dashboard";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ scope = "dashboard", open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const go = React.useCallback(
    (path: string) => {
      onOpenChange(false);
      router.push(path);
    },
    [onOpenChange, router],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Tape une commande ou cherche…" />
      <CommandList>
        <CommandEmpty>Rien trouvé.</CommandEmpty>

        {scope === "dashboard" && (
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => go("/dashboard")}>
              <LayoutDashboard /> Tableau de bord
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/menu")}>
              <UtensilsCrossed /> Éditeur de carte
              <CommandShortcut>M</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/restaurant")}>
              <Building2 /> Mon restaurant
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/billing")}>
              <CreditCard /> Facturation
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/settings")}>
              <Settings /> Paramètres
            </CommandItem>
          </CommandGroup>
        )}

        {scope === "admin" && (
          <CommandGroup heading="Admin">
            <CommandItem onSelect={() => go("/admin")}>
              <ShieldCheck /> Vue d&apos;ensemble
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/clients")}>
              <Users /> Clients
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/restaurants")}>
              <Building2 /> Restaurants
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/settings")}>
              <Settings /> Paramètres
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Compte">
          <CommandItem onSelect={() => go("/api/auth/sign-out")}>
            <LogOut /> Se déconnecter
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
