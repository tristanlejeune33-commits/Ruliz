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
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-mono)", color: "#26438A" }}
        >
          Récupération de compte
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          Mot de passe oublié ?
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          Tape ton email — on t&apos;envoie un lien pour choisir un nouveau
          mot de passe (valable 1h).
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm" style={{ color: "#4A5573" }}>
        Tu te souviens de ton mot de passe ?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "#26438A", textUnderlineOffset: "3px" }}
        >
          Retour à la connexion →
        </Link>
      </p>
    </div>
  );
}
