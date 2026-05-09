"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clearImpersonateCookie,
  getImpersonatedUserId,
  setImpersonateCookie,
} from "@/lib/impersonation";
import { requireAdmin, requireSession } from "@/lib/session";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const startSchema = z.object({
  targetUserId: z.string(),
});

/**
 * Démarre une session d'impersonation : un admin agit en tant qu'un client.
 *
 * - Vérifie que l'appelant est admin.
 * - Vérifie que la cible existe et n'est pas elle-même admin (on ne s'impersone
 *   pas mutuellement, ça crée des cycles bizarres).
 * - Set le cookie httpOnly pour 8h.
 * - Log l'action dans la table `logs` pour traçabilité.
 * - Redirige vers /dashboard pour entrer immédiatement en mode SAV.
 */
export async function startImpersonation(
  input: unknown,
): Promise<ActionResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const session = await requireAdmin(); // garde-fou : redirige si non-admin
  const targetId = Number.parseInt(parsed.data.targetUserId, 10);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return { ok: false, error: "Identifiant invalide" };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, prenom: true, nom: true, email: true },
  });
  if (!target) return { ok: false, error: "Utilisateur introuvable" };
  if (target.role === "admin") {
    return {
      ok: false,
      error: "Impossible d'impersonner un autre admin",
    };
  }

  // Récupère le user admin agissant (depuis la session Better-Auth)
  const adminUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });

  await setImpersonateCookie(target.id);

  // Audit log
  if (adminUser?.userId) {
    await prisma.log
      .create({
        data: {
          userId: adminUser.userId,
          action: "admin.impersonate.start",
          details: {
            targetUserId: target.id,
            targetEmail: target.email,
            targetName: [target.prenom, target.nom].filter(Boolean).join(" "),
          } as object,
        },
      })
      .catch((e) => console.warn("[impersonation] audit log failed:", e));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Termine la session d'impersonation et redirige l'admin vers /admin.
 */
export async function stopImpersonation(): Promise<ActionResult> {
  const session = await requireSession();
  const targetId = await getImpersonatedUserId();

  await clearImpersonateCookie();

  // Log la fin de session
  const adminUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true, user: { select: { role: true } } },
  });
  if (adminUser?.user?.role === "admin" && adminUser.userId && targetId) {
    await prisma.log
      .create({
        data: {
          userId: adminUser.userId,
          action: "admin.impersonate.stop",
          details: { targetUserId: targetId } as object,
        },
      })
      .catch((e) => console.warn("[impersonation] audit log failed:", e));
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}
