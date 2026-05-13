import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer un compte · Ruliz",
};

export default function SignupPage() {
  return (
    <div className="space-y-7">
      <div>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-mono)", color: "#26438A" }}
        >
          Inscription · Restaurateur
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          Crée ton compte gratuit
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          14 jours d&apos;essai Pro offerts. Aucune carte bancaire requise.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm" style={{ color: "#4A5573" }}>
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "#26438A", textUnderlineOffset: "3px" }}
        >
          Se connecter →
        </Link>
      </p>
    </div>
  );
}
