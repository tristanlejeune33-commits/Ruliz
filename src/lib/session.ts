import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type UserRole = "admin" | "client" | "team";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

function getRole(session: Awaited<ReturnType<typeof getCurrentSession>>): UserRole {
  return ((session?.user as { role?: UserRole } | undefined)?.role ?? "client") as UserRole;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (getRole(session) !== "admin") redirect("/dashboard");
  return session;
}

export async function requireDashboard() {
  // Dashboard est accessible aux rôles client + team. Les admin sont redirigés vers /admin.
  const session = await requireSession();
  const role = getRole(session);
  if (role === "admin") redirect("/admin");
  return session;
}
