import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe · Ruliz",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Pas de token dans l'URL → erreur claire avec lien retour
  if (!token) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight">
            Lien invalide
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            Le lien de réinitialisation est incomplet ou a expiré. Refais
            une demande de nouveau mot de passe.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex font-medium text-[var(--accent)] hover:underline"
          style={{ textUnderlineOffset: "3px" }}
        >
          → Demander un nouveau lien
        </Link>
      </div>
    );
  }

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
          Choisis un nouveau mot de passe
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          Minimum 8 caractères. Ce sera ton nouveau mot de passe Ruliz.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
