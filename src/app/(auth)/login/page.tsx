import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/shared/translate";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion Ruliz",
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
          <T>Espace restaurateur</T>
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          <T>Reprenons là où vous vous êtes arrêté</T>
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          <T>
            Vos cartes, vos QR codes et vos statistiques sont restés en ordre.
          </T>
        </p>
      </div>
      <LoginForm
        redirectTo={redirect}
        googleEnabled={Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
        )}
      />
      <p
        className="text-center text-sm"
        style={{ color: "#4A5573" }}
      >
        <T>Pas encore de compte ?</T>{" "}
        <Link
          href="/signup"
          className="font-semibold hover:underline"
          style={{ color: "#26438A", textUnderlineOffset: "3px" }}
        >
          <T>Créer un compte →</T>
        </Link>
      </p>
    </div>
  );
}
