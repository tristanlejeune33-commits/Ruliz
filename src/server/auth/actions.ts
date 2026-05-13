"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Nettoie les cookies session-scoped au login/logout pour éviter qu'un
 * cookie d'un précédent user (active restaurant, impersonation admin SAV)
 * fuite vers un autre compte sur le même navigateur.
 *
 * À appeler côté client juste après signIn / signUp.
 */
export async function clearSessionCookies(): Promise<{ ok: true }> {
  const cookieStore = await cookies();
  cookieStore.delete("ruliz_active_restaurant");
  cookieStore.delete("ruliz_impersonate_user_id");
  return { ok: true };
}

const signupSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
});

/**
 * Self-service signup : crée un User métier + un AuthUser (Better-Auth) liés.
 * Better-Auth `autoSignIn: true` ouvre une session automatiquement.
 */
export async function signupClient(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      role: "client",
      statut: "actif",
      pays: "France",
    },
  });

  try {
    const { user: authUser } = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: `${data.prenom} ${data.nom}`,
      },
    });

    await prisma.authUser.update({
      where: { id: authUser.id },
      data: { userId: user.id },
    });
  } catch (err) {
    // Rollback : Better-Auth a échoué, on supprime le User pour pas bloquer l'email
    await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    console.error("[signup] Better-Auth signUp failed:", err);
    return { ok: false, error: "Impossible de créer le compte." };
  }

  return { ok: true };
}
