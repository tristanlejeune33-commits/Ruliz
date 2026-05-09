import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";
import { getImpersonatedUserId } from "./impersonation";

export type UserRole = "admin" | "client" | "team";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Retourne le rôle métier (admin/client/team) en lisant la table `users`
 * via le `userId` stocké sur `auth_user`.
 */
async function getRole(authUserId: string): Promise<UserRole> {
  const authUser = await prisma.authUser.findUnique({
    where: { id: authUserId },
    select: { user: { select: { role: true, statut: true } } },
  });
  if (!authUser?.user) return "client";
  return authUser.user.role as UserRole;
}

export async function requireAdmin() {
  const session = await requireSession();
  const role = await getRole(session.user.id);
  if (role !== "admin") redirect("/dashboard");
  return session;
}

/**
 * Le dashboard est accessible aux rôles `client` + `team`.
 *
 * Cas spécial : un admin EN MODE IMPERSONATION (cookie ruliz_impersonate_user_id
 * actif) peut accéder au dashboard pour aider un client (SAV). Sans le cookie,
 * un admin est redirigé vers /admin.
 */
export async function requireDashboard() {
  const session = await requireSession();
  const role = await getRole(session.user.id);

  if (role === "admin") {
    // Si l'admin impersone un client, on l'autorise sur /dashboard
    const impersonatedId = await getImpersonatedUserId();
    if (impersonatedId) return session;
    redirect("/admin");
  }

  return session;
}
