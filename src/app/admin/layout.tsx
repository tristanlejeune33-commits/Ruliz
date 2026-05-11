import { cookies } from "next/headers";
import { AppShell, COLLAPSED_COOKIE } from "@/components/shared/app-shell";
import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFooter } from "@/components/shared/sidebar-footer";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { requireAdmin } from "@/lib/session";

// Force dynamic — l'admin layout ne doit jamais être mis en cache HTML.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  const cookieStore = await cookies();
  const collapsedCookie = cookieStore.get(COLLAPSED_COOKIE);
  const defaultCollapsed = collapsedCookie?.value === "1";

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      scope="admin"
      defaultCollapsed={defaultCollapsed}
      sidebar={
        <>
          <SidebarBrand href="/admin" pillLabel="Admin" pillTone="violet" />
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav scope="admin" />
          </div>
          <SidebarFooter
            user={{ name: session.user.name, email: session.user.email }}
            hint="Console admin"
          />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
