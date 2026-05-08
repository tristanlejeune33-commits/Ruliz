import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)]/50 bg-[var(--bg-primary)]/70 backdrop-blur-xl">
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
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Essayer gratuitement <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--border-subtle)] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <Logo variant="mark" className="size-6" />
            <span>© {new Date().getFullYear()} Ruliz — Made in Bordeaux 🍷</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <Link href="/legal/cgv" className="hover:text-[var(--text-primary)]">
              CGV
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--text-primary)]">
              Confidentialité
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--text-primary)]">
              Cookies
            </Link>
            <Link href="/legal/mentions" className="hover:text-[var(--text-primary)]">
              Mentions légales
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
