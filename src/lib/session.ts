import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";
import { getAdminDemoFlag } from "./admin-demo";

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

export async function requireDashboard() {
  // Dashboard est accessible aux rôles client + team. Les admin sont
  // redirigés vers /admin, SAUF en "mode démo admin" (cookie set par
  // /admin/demo) qui leur autorise l'accès au dashboard avec leur resto
  // fictif. Cf. src/lib/admin-demo.ts.
  const session = await requireSession();
  const role = await getRole(session.user.id);
  if (role === "admin") {
    const demoMode = await getAdminDemoFlag();
    if (!demoMode) redirect("/admin");
  }
  return session;
}
