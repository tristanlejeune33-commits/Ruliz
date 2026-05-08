"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { removeTeamMember } from "@/server/dashboard/team-actions";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  member: {
    id: number;
    email: string;
    name: string;
    lastLoginAt: string | null;
  };
}

export function TeamMembersList({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRemove = (memberId: string) => {
    startTransition(async () => {
      const res = await removeTeamMember({ memberId: Number(memberId) });
      if (res.ok) {
        toast.success("Membre retiré");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  function initials(name: string) {
    return (
      name
        .split(/[\s.@]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "?"
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-3">
          <Avatar>
            <AvatarFallback>{initials(m.member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.member.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {m.member.email}
            </p>
          </div>
          <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--text-secondary)]">
            {m.role}
          </span>
          <span className="hidden text-xs text-[var(--text-muted)] md:inline">
            {m.member.lastLoginAt
              ? formatDistanceToNow(new Date(m.member.lastLoginAt), {
                  addSuffix: true,
                  locale: fr,
                })
              : `Ajouté ${format(new Date(m.createdAt), "d MMM", { locale: fr })}`}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                className="text-[var(--color-destructive)]"
                aria-label="Retirer"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserMinus className="size-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retirer {m.member.name} ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le membre perd l&apos;accès à tes restaurants. Action réversible : tu
                  peux le réinviter à tout moment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRemove(m.id)}>
                  <Trash2 className="size-4" />
                  Retirer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
      ))}
    </ul>
  );
}
