import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * Auth layout — light mode forcé (logique marketing : un visiteur non connecté
 * n'a pas encore de préférence stockée, on lui sert une UI accueillante claire).
 * Le toggle dark/light du dashboard s'applique uniquement après login.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="grid min-h-screen bg-[var(--bg-primary)] lg:grid-cols-2">
      {/* Form pane — fond blanc */}
      <div className="flex flex-col bg-[var(--bg-primary)] px-6 py-10 lg:px-12">
        <header className="mb-12">
          <Link href="/" aria-label="Retour à l'accueil">
            <Logo variant="full" priority />
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer className="mt-12 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>© {new Date().getFullYear()} Ruliz</span>
          <nav className="flex gap-4">
            <Link href="/legal/cgv" className="hover:text-[var(--text-primary)]">CGV</Link>
            <Link href="/legal/privacy" className="hover:text-[var(--text-primary)]">Confidentialité</Link>
          </nav>
        </footer>
      </div>

      {/* Showcase pane — bleu signature plein, texte blanc, pas de gradient
          décoratif (single-accent strict du DS light) */}
      <div
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "#26438A" }}
      >
        {/* Subtle pattern : grille fine pour rappel datasheet */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Light tint depuis le coin haut-droit pour donner du volume */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/8 blur-3xl"
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo variant="mark" inverted className="size-12" />
          <div className="max-w-md">
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              Ruliz — Pour les restaurateurs ambitieux
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
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
