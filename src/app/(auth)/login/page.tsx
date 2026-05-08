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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Heureux de te revoir</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Connecte-toi pour accéder à ton dashboard.
        </p>
      </div>
      <LoginForm redirectTo={redirect} />
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-[var(--accent)] hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
