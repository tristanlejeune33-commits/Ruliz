import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { CartePreviewPane } from "./carte-preview-pane";

/**
 * Auth layout — light mode forcé (logique marketing : un visiteur non connecté
 * n'a pas encore de préférence stockée, on lui sert une UI accueillante claire).
 * Le toggle dark/light du dashboard s'applique uniquement après login.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="light"
      className="grid min-h-screen bg-[var(--bg-primary)] lg:grid-cols-[1fr_1.05fr]"
    >
      {/* Form pane — fond blanc */}
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

      {/* Showcase pane — phone preview avec mockup carte ou iframe live */}
      <div className="relative hidden overflow-hidden lg:block">
        <CartePreviewPane />
      </div>
    </div>
  );
}
