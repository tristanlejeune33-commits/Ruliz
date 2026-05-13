"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { clearSessionCookies } from "@/server/auth/actions";

interface UserMenuProps {
  user: {
    name?: string | null;
    email: string;
  };
  /** Where to redirect after signing out. */
  signOutRedirect?: string;
}

function initials(value: string | null | undefined, fallback: string) {
  const source = value && value.trim().length > 0 ? value : fallback;
  return source
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function UserMenu({ user, signOutRedirect = "/login" }: UserMenuProps) {
  const router = useRouter();

  async function handleSignOut() {
    // Nettoie cookies session-scoped (active resto, impersonation) avant le
    // signOut Better-Auth — évite qu'ils survivent au changement de compte.
    await clearSessionCookies().catch(() => null);
    await authClient.signOut();
    router.push(signOutRedirect);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-1.5"
          aria-label="Menu utilisateur"
        >
          <Avatar className="size-7">
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {user.name ?? "Utilisateur"}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <UserIcon /> Profil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings /> Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]">
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
