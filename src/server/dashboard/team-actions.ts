"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAddTeamMember } from "@/lib/restaurant-limits";
import { sendMail } from "@/lib/resend";
import { emailLayout, lead, p, infoBox } from "@/lib/email-template";
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
    html: emailLayout({
      title: "Bienvenue dans l'équipe",
      eyebrow: "Invitation Ruliz",
      preheader: `Tu as été ajouté comme ${parsed.data.role} à une équipe Ruliz.`,
      body: `
        ${lead(`Salut${invitee.prenom ? ` ${invitee.prenom}` : ""},`)}
        ${p(`Tu as été ajouté comme <strong>${parsed.data.role}</strong> à une équipe Ruliz. Tu peux maintenant te connecter pour gérer la carte digitale avec tes collègues.`)}
        ${infoBox(
          `<strong>Ton rôle :</strong> ${parsed.data.role}<br>
          <span style="color:#8892AB;font-size:13px;">${
            parsed.data.role === "editor"
              ? "Tu peux modifier la carte, ajouter des produits et gérer les QR codes."
              : "Tu peux consulter la carte et les statistiques."
          }</span>`,
        )}
      `,
      cta: {
        label: "Me connecter à Ruliz",
        url: `${getAppUrl()}/login`,
      },
    }),
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
