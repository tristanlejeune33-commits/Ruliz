import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { canAddTeamMember } from "@/lib/restaurant-limits";
import { requireDashboard } from "@/lib/session";
import { TeamMembersList } from "./team-members-list";
import { TeamInviteForm } from "./team-invite-form";

export const metadata: Metadata = {
  title: "Équipe · Ruliz",
};

export default async function TeamPage() {
  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });

  if (!authUser?.userId) {
    return null;
  }

  const [members, limit] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId: authUser.userId },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    canAddTeamMember(authUser.userId),
  ]);

  const limitLabel =
    limit.max === null ? "illimité" : `${limit.current} / ${limit.max}`;

  const serializedMembers = members.map((m) => ({
    id: m.id.toString(),
    role: m.roleMember,
    createdAt: m.createdAt.toISOString(),
    member: {
      id: m.member.id,
      email: m.member.email,
      name: [m.member.prenom, m.member.nom].filter(Boolean).join(" ") || m.member.email,
      lastLoginAt: m.member.lastLoginAt?.toISOString() ?? null,
    },
  }));

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="secondary">
          <Users className="size-3" /> Équipe
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Membres de l&apos;équipe
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Invite tes collaborateurs à éditer la carte. Plan {limit.plan} : {limitLabel}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inviter un membre</CardTitle>
          <CardDescription>
            Le membre doit déjà avoir un compte Ruliz. Il recevra un email de notification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamInviteForm canAdd={limit.ok} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membres actuels</CardTitle>
          <CardDescription>
            {members.length} membre{members.length > 1 ? "s" : ""} dans ton équipe.
            Tu n&apos;es pas listé : tu es propriétaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              Aucun membre. Invite quelqu&apos;un ci-dessus pour commencer.
            </p>
          ) : (
            <TeamMembersList members={serializedMembers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

