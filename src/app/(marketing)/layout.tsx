import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

/**
 * Marketing layout — light mode forcé (visiteur non connecté = pas de
 * préférence, on lui sert l'UI accueillante claire). Pas de toggle ici :
 * il est réservé au dashboard authentifié.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      className="flex min-h-screen flex-col bg-[var(--bg-primary)]"
    >
      <header className="sticky top-0 z-40 border-b border-[var(--border-glass)] bg-[var(--bg-primary)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" aria-label="Ruliz, retour à l'accueil">
            <Logo variant="full" priority />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" asChild>
              <Link href="/#features">Fonctionnalités</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/#pricing">Tarifs</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/#faq">FAQ</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Essayer gratuitement <ArrowRight className="size-3.5" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--border-glass)] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <Logo variant="mark" className="size-6" />
            <span>© {new Date().getFullYear()} Ruliz · Made in Bordeaux</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-tertiary)]">
            <Link
              href="/legal/mentions-legales#cgv"
              className="hover:text-[var(--text-primary)]"
            >
              CGV
            </Link>
            <Link
              href="/legal/mentions-legales#confidentialite"
              className="hover:text-[var(--text-primary)]"
            >
              Confidentialité
            </Link>
            <Link
              href="/legal/mentions-legales#cookies"
              className="hover:text-[var(--text-primary)]"
            >
              Cookies
            </Link>
            <Link
              href="/legal/mentions-legales"
              className="hover:text-[var(--text-primary)]"
            >
              Mentions légales
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
