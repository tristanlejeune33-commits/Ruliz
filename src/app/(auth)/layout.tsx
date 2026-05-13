import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { prisma } from "@/lib/db";
import { ensureAdminDemoRestaurant } from "@/lib/admin-demo";
import { CartePreviewPane } from "./carte-preview-pane";

/**
 * Auth layout light mode forcé (logique marketing : un visiteur non connecté
 * n'a pas encore de préférence stockée, on lui sert une UI accueillante claire).
 * Le toggle dark/light du dashboard s'applique uniquement après login.
 *
 * Le pane droit affiche la **carte démo admin (Bistrot Ruliz)** par défaut
 * dans l'iframe du téléphone. Si la query échoue (table manquante, pas de
 * resto démo créé), on retombe sur le mockup statique.
 */
async function getDemoCarteId(): Promise<string | null> {
  try {
    // Priorité : email admin spécifique via env ADMIN_DEMO_EMAIL (recommandé
    // en prod pour cibler le bon compte), fallback sur le premier admin.
    const adminEmail =
      process.env.ADMIN_DEMO_EMAIL ?? "tristanlejeune33@gmail.com";

    // Cherche le resto démo de l'admin spécifique
    const existing = await prisma.restaurant.findFirst({
      where: { user: { role: "admin", email: adminEmail } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing) return existing.id.toString();

    // Pas de resto démo encore → on le crée à la volée pour que l'iframe
    // de la page login charge directement la VRAIE carte de l'admin (au
    // lieu de retomber sur le mockup statique). Idempotent : si l'admin
    // clique ensuite sur "Ma carte démo", la même carte est retournée.
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin", email: adminEmail },
      select: { id: true },
    });
    if (adminUser) {
      const created = await ensureAdminDemoRestaurant(adminUser.id);
      return created.id.toString();
    }

    // Fallback ultime : premier admin trouvé (compte différent de l'email
    // configuré, ex: en dev local avec un seed différent).
    const fallback = await prisma.restaurant.findFirst({
      where: { user: { role: "admin" } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return fallback ? fallback.id.toString() : null;
  } catch (err) {
    console.warn("[auth-layout] getDemoCarteId failed:", err);
    return null;
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoCarteId = await getDemoCarteId();
  const defaultCarteUrl = demoCarteId ? `/carte/${demoCarteId}` : undefined;

  return (
    <div
      data-theme="light"
      className="grid min-h-screen bg-[var(--bg-primary)] lg:grid-cols-[1fr_1.05fr]"
    >
      {/* Form pane fond blanc */}
      <div className="flex flex-col bg-[var(--bg-primary)] px-6 py-10 lg:px-14">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Retour à l'accueil">
            <Logo variant="full" priority />
          </Link>
          <span
            className="hidden items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)] sm:inline-flex"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="rz-pulse" aria-hidden />
            Services opérationnels
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer
          className="flex items-center justify-between text-[11px] tracking-wider text-[var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span>© {new Date().getFullYear()} Ruliz</span>
          <nav className="flex gap-4">
            <Link
              href="/legal/mentions-legales"
              className="hover:text-[var(--text-primary)]"
            >
              CGV
            </Link>
            <Link
              href="/legal/politique-confidentialite"
              className="hover:text-[var(--text-primary)]"
            >
              Confidentialité
            </Link>
          </nav>
        </footer>
      </div>

      {/* Showcase pane phone preview avec carte démo Bistrot Ruliz */}
      <div className="relative hidden overflow-hidden lg:block">
        <CartePreviewPane defaultCarteUrl={defaultCarteUrl} />
      </div>
    </div>
  );
}
