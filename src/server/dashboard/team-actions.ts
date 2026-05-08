"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAddTeamMember } from "@/lib/restaurant-limits";
import { sendMail } from "@/lib/resend";
import { requireDashboard } from "@/lib/session";
import { getAppUrl } from "@/lib/url";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function getCurrentMetierUserId(): Promise<number | null> {
  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  return authUser?.userId ?? null;
}

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["editor", "viewer"]),
});

/**
 * Light invitation : the invitee must already be registered. We just create
 * the team_members row and notify them.
 *
 * Full invitation flow (token + signup) is deferred until we add a dedicated
 * `team_invitations` table.
 */
export async function inviteTeamMember(input: unknown): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };

  const ownerId = await getCurrentMetierUserId();
  if (!ownerId) return { ok: false, error: "Compte introuvable" };

  // Check plan limit
  const limit = await canAddTeamMember(ownerId);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Ton plan ${limit.plan} est limité à ${limit.max} membres d'équipe. Passe Premium pour des places illimitées.`,
    };
  }

  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, prenom: true, statut: true },
  });

  if (!invitee) {
    return {
      ok: false,
      error:
        "Cet email n'a pas encore de compte Ruliz. Demande à la personne de créer un compte (gratuit), puis réessaie.",
    };
  }

  if (invitee.statut !== "actif") {
    return { ok: false, error: "Ce compte n'est pas actif." };
  }

  if (invitee.id === ownerId) {
    return { ok: false, error: "Tu es déjà propriétaire." };
  }

  // Already invited ?
  const existing = await prisma.teamMember.findFirst({
    where: { userId: ownerId, memberUserId: invitee.id },
  });
  if (existing) {
    return { ok: false, error: "Ce membre est déjà dans ton équipe." };
  }

  await prisma.teamMember.create({
    data: {
      userId: ownerId,
      memberUserId: invitee.id,
      roleMember: parsed.data.role,
    },
  });

  await sendMail({
    to: invitee.email,
    subject: "Tu as été ajouté à une équipe Ruliz",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 16px">Bienvenue dans l'équipe</h1>
        <p style="margin:0 0 16px;line-height:1.5">
          Hello ${invitee.prenom ?? ""},<br>
          Tu as été ajouté comme <strong>${parsed.data.role}</strong> à une équipe Ruliz. Connecte-toi pour gérer la carte avec tes collègues.
        </p>
        <p style="margin:0 0 32px">
          <a href="${getAppUrl()}/login" style="background:#4870e0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">
            Me connecter à Ruliz
          </a>
        </p>
      </div>
    `,
  });

  revalidatePath("/dashboard/team");
  return { ok: true };
}

const removeSchema = z.object({ memberId: z.coerce.number().int().positive() });

export async function removeTeamMember(input: unknown): Promise<ActionResult> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalide" };

  const ownerId = await getCurrentMetierUserId();
  if (!ownerId) return { ok: false, error: "Compte introuvable" };

  await prisma.teamMember.deleteMany({
    where: {
      id: BigInt(parsed.data.memberId),
      userId: ownerId,
    },
  });

  revalidatePath("/dashboard/team");
  return { ok: true };
}
