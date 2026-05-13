import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié · Ruliz",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-7">
      <div>
        <span
          className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Récupération de compte
        </span>
        <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.15] tracking-tight">
          Mot de passe oublié ?
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          Tape ton email — on t&apos;envoie un lien pour choisir un nouveau
          mot de passe (valable 1h).
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Tu te souviens de ton mot de passe ?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--accent)] hover:underline"
          style={{ textUnderlineOffset: "3px" }}
        >
          Retour à la connexion →
        </Link>
      </p>
    </div>
  );
}
