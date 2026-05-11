"use client";

import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  HelpCircle,
  LogOut,
  Scale,
  Settings,
  ShieldCheck,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { useSidebarCollapse } from "./sidebar-collapse-context";
import { usePanelLang } from "./panel-lang-context";

interface SidebarFooterProps {
  user: {
    name?: string | null;
    email: string;
  };
  hint?: string;
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
 * Carte utilisateur en bas de sidebar — avatar gradient cyan→violet, status
 * dot success, dropdown profil/settings/logout. En mode collapsed : avatar
 * seul + tooltip du nom.
 */
export function SidebarFooter({
  user,
  hint,
  signOutRedirect = "/login",
}: SidebarFooterProps) {
  const router = useRouter();
  const { collapsed } = useSidebarCollapse();
  const { t } = usePanelLang();

  async function handleSignOut() {
    await authClient.signOut();
    router.push(signOutRedirect);
    router.refresh();
  }

  const displayName =
    user.name?.trim() || user.email.split("@")[0] || user.email;

  const trigger = (
    <button
      type="button"
      className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-transparent bg-transparent p-1.5 text-left transition-all duration-200 hover:border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)]"
      aria-label={t("userMenu.aria")}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-4 -top-4 size-16 rounded-full bg-[var(--neon-cyan)]/0 blur-2xl transition-colors duration-300 group-hover:bg-[var(--neon-cyan)]/15"
      />
      <span className="relative shrink-0">
        <Avatar className="size-8 ring-1 ring-[var(--border-glass)] ring-offset-2 ring-offset-[var(--bg-primary)]">
          <AvatarFallback className="bg-gradient-to-br from-[var(--neon-cyan-soft)] via-[var(--neon-violet-soft)] to-[var(--neon-cyan-soft)] text-[11px] font-semibold text-[var(--text-primary)]">
            {initials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--neon-success)] ring-2 ring-[var(--bg-primary)]"
          title={t("userMenu.online")}
        />
      </span>
      {!collapsed && (
        <>
          <div className="relative flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="truncate text-[10px] text-[var(--text-tertiary)]">
              {hint ?? user.email}
            </span>
          </div>
          <ChevronsUpDown className="relative size-3 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-primary)]" />
        </>
      )}
    </button>
  );

  const dropdown = (
    <DropdownMenuContent
      align={collapsed ? "start" : "start"}
      side="top"
      sideOffset={8}
      className="w-[244px] p-1"
    >
      <div className="px-2 py-2">
        <DropdownMenuLabel className="flex items-center gap-2 p-0 normal-case tracking-normal">
          <Avatar className="size-9">
            <AvatarFallback className="bg-gradient-to-br from-[var(--neon-cyan-soft)] via-[var(--neon-violet-soft)] to-[var(--neon-cyan-soft)] text-[12px] font-semibold text-[var(--text-primary)]">
              {initials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="truncate text-xs text-[var(--text-tertiary)]">
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
        <UserIcon strokeWidth={1.75} /> {t("userMenu.profile")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => router.push("/dashboard/settings")}
        className="rounded-md gap-2"
      >
        <Settings strokeWidth={1.75} /> {t("userMenu.settings")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => router.push("/dashboard/billing")}
        className="rounded-md gap-2"
      >
        <HelpCircle strokeWidth={1.75} /> {t("userMenu.help")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {/* === Liens légaux : ouverts dans un nouvel onglet pour ne pas
           interrompre le flow de travail dans le panel === */}
      <DropdownMenuItem
        onClick={() =>
          window.open(
            "/legal/mentions-legales",
            "_blank",
            "noopener,noreferrer",
          )
        }
        className="rounded-md gap-2"
      >
        <Scale strokeWidth={1.75} /> {t("userMenu.legalMentions")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() =>
          window.open(
            "/legal/politique-confidentialite",
            "_blank",
            "noopener,noreferrer",
          )
        }
        className="rounded-md gap-2"
      >
        <ShieldCheck strokeWidth={1.75} /> {t("userMenu.legalPrivacy")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleSignOut}
        className="rounded-md gap-2 text-[var(--neon-danger)] data-[highlighted]:text-[var(--neon-danger)]"
      >
        <LogOut strokeWidth={1.75} /> {t("userMenu.signOut")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className="border-t border-[var(--border-glass)] p-2">
      <DropdownMenu>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {displayName}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        )}
        {dropdown}
      </DropdownMenu>
    </div>
  );
}
