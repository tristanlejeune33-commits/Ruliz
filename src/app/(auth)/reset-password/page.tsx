import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe Ruliz",
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
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ fontFamily: "var(--font-mono)", color: "#B91C3B" }}
          >
            Lien invalide
          </span>
          <h1
            className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
            style={{ color: "#0B1530" }}
          >
            Ce lien n&apos;est plus valable
          </h1>
          <p
            className="mt-2.5 text-sm leading-relaxed"
            style={{ color: "#4A5573" }}
          >
            Le lien de réinitialisation est incomplet ou a expiré. Refais une
            demande de nouveau mot de passe.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex font-semibold hover:underline"
          style={{ color: "#26438A", textUnderlineOffset: "3px" }}
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
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-mono)", color: "#26438A" }}
        >
          Récupération de compte
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          Choisis un nouveau mot de passe
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          Minimum 8 caractères. Ce sera ton nouveau mot de passe Ruliz.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
