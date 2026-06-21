import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { T } from "@/components/shared/translate";
import { PanelLangProvider } from "@/components/shared/panel-lang-context";
import { prisma } from "@/lib/db";
import { ensureAdminDemoRestaurant } from "@/lib/admin-demo";
import { detectCountry } from "@/lib/geo";
import { signupLanguageForCountry } from "@/lib/country-language";
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
    const adminEmail =
      process.env.ADMIN_DEMO_EMAIL ?? "tristanlejeune33@gmail.com";

    // 1. Resto déjà existant pour l'admin Tristan (email exact)
    const byEmail = await prisma.restaurant.findFirst({
      where: { user: { role: "admin", email: adminEmail } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (byEmail) {
      console.log("[auth-layout] demo carte found by admin email:", adminEmail);
      return byEmail.id.toString();
    }

    // 2. Cherche un admin (n'importe lequel) et crée sa carte démo si pas existant
    const anyAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (anyAdmin) {
      // L'admin existe peut-être déjà avec un resto (cas dev local)
      const existingAdminResto = await prisma.restaurant.findFirst({
        where: { userId: anyAdmin.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (existingAdminResto) {
        console.log(
          "[auth-layout] demo carte found for admin:",
          anyAdmin.email,
        );
        return existingAdminResto.id.toString();
      }
      // Sinon crée la carte démo pour cet admin
      try {
        const created = await ensureAdminDemoRestaurant(anyAdmin.id);
        console.log(
          "[auth-layout] demo carte created for admin:",
          anyAdmin.email,
          "→ resto",
          created.id.toString(),
        );
        return created.id.toString();
      } catch (err) {
        console.warn(
          "[auth-layout] ensureAdminDemoRestaurant failed:",
          err,
        );
      }
    }

    // 3. Fallback ultime : n'importe quel restaurant existant (cas seed clients)
    const anyResto = await prisma.restaurant.findFirst({
      where: { statut: "actif" },
      orderBy: { createdAt: "asc" },
      select: { id: true, nom: true },
    });
    if (anyResto) {
      console.log(
        "[auth-layout] demo carte fallback to first resto:",
        anyResto.nom,
      );
      return anyResto.id.toString();
    }

    console.log("[auth-layout] no resto found at all, fallback static mockup");
    return null;
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
  // ?preview=1 → bloque le tracking scan côté carte/[id]/page.tsx. Sinon
  // chaque visite login/signup gonflait artificiellement le compteur du
  // resto démo (l'iframe se charge à CHAQUE page d'auth).
  const defaultCarteUrl = demoCarteId
    ? `/carte/${demoCarteId}?preview=1`
    : undefined;

  // Langue de l'interface auth selon le pays détecté (IP). Les pages login/
  // signup s'affichent ainsi dans la langue du visiteur (fallback anglais si
  // langue non supportée, fr si pays indéterminé).
  const detectedCountry = await detectCountry();
  const uiLang = signupLanguageForCountry(detectedCountry);

  return (
    <PanelLangProvider initialLang={uiLang} refreshOnChange={false}>
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
            <T>Services opérationnels</T>
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
              <T>CGV</T>
            </Link>
            <Link
              href="/legal/politique-confidentialite"
              className="hover:text-[var(--text-primary)]"
            >
              <T>Confidentialité</T>
            </Link>
          </nav>
        </footer>
      </div>

      {/* Showcase pane phone preview avec carte démo Bistrot Ruliz */}
      <div className="relative hidden overflow-hidden lg:block">
        <CartePreviewPane defaultCarteUrl={defaultCarteUrl} />
      </div>
    </div>
    </PanelLangProvider>
  );
}
