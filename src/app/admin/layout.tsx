import { AppShell } from "@/components/shared/app-shell";
import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFooter } from "@/components/shared/sidebar-footer";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      scope="admin"
      sidebar={
        <>
          <SidebarBrand href="/admin" pillLabel="Admin" />
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
