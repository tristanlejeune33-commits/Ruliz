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
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "#26438A",
          }}
        >
          Connexion · Restaurateur
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          Reprenons là où vous vous êtes arrêté.
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          Vos cartes, vos QR codes, vos statistiques — tout est resté en ordre.
        </p>
      </div>
      <LoginForm redirectTo={redirect} />
      <p
        className="text-center text-sm"
        style={{ color: "#4A5573" }}
      >
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="font-semibold hover:underline"
          style={{ color: "#26438A", textUnderlineOffset: "3px" }}
        >
          Créer un compte →
        </Link>
      </p>
    </div>
  );
}
