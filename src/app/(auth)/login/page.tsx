import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion · Ruliz",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <div className="space-y-7">
      <div>
        <span
          className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Connexion · Restaurateur
        </span>
        <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.15] tracking-tight">
          Reprenons là où vous vous êtes arrêté.
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          Vos cartes, vos QR codes, vos statistiques — tout est resté en ordre.
        </p>
      </div>
      <LoginForm redirectTo={redirect} />
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--accent)] hover:underline"
          style={{ textUnderlineOffset: "3px" }}
        >
          Créer un compte →
        </Link>
      </p>
    </div>
  );
}
