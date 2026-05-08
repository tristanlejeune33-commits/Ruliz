import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer un compte · Ruliz",
};

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Crée ton compte gratuit
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          14 jours d&apos;essai Pro offerts. Aucune carte bancaire requise.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
