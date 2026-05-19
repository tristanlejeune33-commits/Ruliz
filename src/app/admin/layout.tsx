import { cookies } from "next/headers";
import { AppShell, COLLAPSED_COOKIE } from "@/components/shared/app-shell";
import { AutoTranslateWrapper } from "@/components/shared/auto-translate-wrapper";
import {
  PanelLangProvider,
  PANEL_LANG_COOKIE,
} from "@/components/shared/panel-lang-context";
import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFooter } from "@/components/shared/sidebar-footer";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { isSupportedLang, type SupportedLang } from "@/lib/langs";
import { requireAdmin } from "@/lib/session";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";

// Force dynamic l'admin layout ne doit jamais être mis en cache HTML.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garantit que toutes les colonnes/tables ajoutées tardivement existent
  // en DB avant que Prisma ne les sélectionne. No-op après le 1er call.
  await ensureRuntimeSchema();

  const session = await requireAdmin();

  const cookieStore = await cookies();
  const collapsedCookie = cookieStore.get(COLLAPSED_COOKIE);
  const defaultCollapsed = collapsedCookie?.value === "1";

  // Lecture cookie panel lang (idem dashboard)
  const langCookie = cookieStore.get(PANEL_LANG_COOKIE)?.value;
  const panelLang: SupportedLang = isSupportedLang(langCookie)
    ? langCookie
    : "fr";

  return (
    <PanelLangProvider initialLang={panelLang}>
      <AutoTranslateWrapper>
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
      </AutoTranslateWrapper>
    </PanelLangProvider>
  );
}
