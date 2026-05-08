import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form pane */}
      <div className="flex flex-col bg-[var(--bg-primary)] px-6 py-10 lg:px-12">
        <header className="mb-12">
          <Link href="/" aria-label="Retour à l'accueil">
            <Logo variant="full" priority />
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer className="mt-12 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>© {new Date().getFullYear()} Ruliz</span>
          <nav className="flex gap-4">
            <Link href="/legal/cgv" className="hover:text-[var(--text-primary)]">CGV</Link>
            <Link href="/legal/privacy" className="hover:text-[var(--text-primary)]">Confidentialité</Link>
          </nav>
        </footer>
      </div>

      {/* Showcase pane */}
      <div
        className="relative hidden overflow-hidden lg:block"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--accent) 0%, transparent 55%), radial-gradient(circle at 70% 70%, oklch(0.5 0.18 280) 0%, transparent 55%), var(--bg-primary)",
        }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo variant="mark" inverted className="size-12" />
          <div className="max-w-md">
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              Ruliz — Pour les restaurateurs ambitieux
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-4xl">
              « On a divisé par 3 le temps qu&apos;on passait à expliquer la carte aux touristes. »
            </h2>
            <p className="mt-6 text-sm text-white/80">
              — Marie Dubois, Le Tire-Bouchon, Bordeaux
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
