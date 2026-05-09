"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

interface SidebarFooterProps {
  user: {
    name?: string | null;
    email: string;
  };
  /** Optionnel : étiquette en bas (ex: "Plan Pro · 12j restants") */
  hint?: string;
  /** Où rediriger après logout */
  signOutRedirect?: string;
}

function initials(value: string | null | undefined, fallback: string) {
  const source = value && value.trim().length > 0 ? value : fallback;
  return (
    source
      .split(/[\s.@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Footer de la sidebar — carte utilisateur compacte façon Linear/Vercel.
 * Affiche avatar + nom + email + un dropdown pour Profil/Settings/Logout.
 */
export function SidebarFooter({
  user,
  hint,
  signOutRedirect = "/login",
}: SidebarFooterProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push(signOutRedirect);
    router.refresh();
  }

  return (
    <div className="border-t border-[var(--border-subtle)] p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-transparent p-1.5 text-left transition-all duration-200 hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/60"
            aria-label="Menu utilisateur"
          >
            <Avatar className="size-8 ring-1 ring-[var(--border-subtle)] ring-offset-2 ring-offset-[var(--bg-primary)]">
              <AvatarFallback className="bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 text-[11px] font-semibold text-[var(--text-primary)]">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                {user.name ?? user.email.split("@")[0]}
              </span>
              <span className="truncate text-[10px] text-[var(--text-muted)]">
                {hint ?? user.email}
              </span>
            </div>
            <ChevronsUpDown className="size-3 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-[240px] p-1"
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {user.name ?? "Utilisateur"}
            </span>
            <span className="truncate text-xs text-[var(--text-muted)]">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings")}
            className="rounded-md"
          >
            <UserIcon /> Profil
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings")}
            className="rounded-md"
          >
            <Settings /> Paramètres
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="rounded-md text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
          >
            <LogOut /> Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
