"use client";

import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  HelpCircle,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
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
 * Avatar avec gradient accent, status dot, dropdown profil/settings/logout.
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

  const displayName = user.name?.trim() || user.email.split("@")[0] || user.email;

  return (
    <div className="border-t border-[var(--border-subtle)] p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-transparent bg-transparent p-2 text-left transition-all duration-200 hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/60"
            aria-label="Menu utilisateur"
          >
            {/* Glow décoratif au hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute -left-4 -top-4 size-16 rounded-full bg-[var(--accent)]/0 blur-2xl transition-colors duration-300 group-hover:bg-[var(--accent)]/12"
            />
            {/* Avatar avec gradient accent + status online dot */}
            <span className="relative shrink-0">
              <Avatar className="size-8 ring-1 ring-[var(--border-subtle)] ring-offset-2 ring-offset-[var(--bg-primary)]">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent)]/30 via-[var(--accent)]/15 to-[var(--accent)]/5 text-[11px] font-semibold text-[var(--text-primary)]">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[oklch(0.7_0.18_145)] ring-2 ring-[var(--bg-primary)]"
                title="En ligne"
              />
            </span>
            <div className="relative flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                {displayName}
              </span>
              <span className="truncate text-[10px] text-[var(--text-muted)]">
                {hint ?? user.email}
              </span>
            </div>
            <ChevronsUpDown className="relative size-3 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-[244px] p-1"
        >
          <div className="px-2 py-2">
            <DropdownMenuLabel className="flex items-center gap-2 p-0 normal-case tracking-normal">
              <Avatar className="size-9">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent)]/30 via-[var(--accent)]/15 to-[var(--accent)]/5 text-[12px] font-semibold text-[var(--text-primary)]">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {displayName}
                </span>
                <span className="truncate text-xs text-[var(--text-muted)]">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings")}
            className="rounded-md gap-2"
          >
            <UserIcon /> Profil
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings")}
            className="rounded-md gap-2"
          >
            <Settings /> Paramètres
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/billing")}
            className="rounded-md gap-2"
          >
            <HelpCircle /> Aide & support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="rounded-md gap-2 text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
          >
            <LogOut /> Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
