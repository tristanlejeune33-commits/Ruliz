"use server";

import { headers, cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { countryName, languageFromCountry } from "@/lib/country-language";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Nettoie les cookies session-scoped au login/logout pour éviter qu'un
 * cookie d'un précédent user (active restaurant, impersonation admin SAV,
 * mode démo admin) fuite vers un autre compte sur le même navigateur.
 *
 * À appeler côté client juste après signIn / signUp.
 */
export async function clearSessionCookies(): Promise<{ ok: true }> {
  const cookieStore = await cookies();
  cookieStore.delete("ruliz_active_restaurant");
  cookieStore.delete("ruliz_impersonate_user_id");
  cookieStore.delete("ruliz_admin_demo");
  return { ok: true };
}

/**
 * Retourne l'URL où rediriger l'utilisateur juste après un login réussi :
 *   - admin (role=admin) → /admin
 *   - sinon → /dashboard (ou redirectTo si fourni et autorisé)
 *
 * Appelé côté client depuis le login-form après signIn.email().
 */
export async function getPostLoginUrl(
  redirectTo?: string,
): Promise<{ url: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { url: "/login" };

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { role: true } } },
  });
  const role = authUser?.user?.role ?? "client";

  if (role === "admin") return { url: "/admin" };

  // Whitelist redirectTo aux chemins internes pour éviter l'open redirect.
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return { url: redirectTo };
  }
  return { url: "/dashboard" };
}

const signupSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
  /** Code pays ISO 2 (FR, IT, etc.) sert à inférer la langue native */
  country: z.string().length(2).default("FR"),
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

  const paysFullName = countryName(data.country) || "France";
  const langueNative = languageFromCountry(data.country);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      role: "client",
      statut: "actif",
      pays: paysFullName,
      countryCode: data.country.toUpperCase(),
      langueNative,
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
