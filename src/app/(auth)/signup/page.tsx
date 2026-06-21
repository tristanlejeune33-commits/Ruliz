import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer un compte Ruliz",
};

interface PageProps {
  searchParams: Promise<{ prospect?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const { prospect: prospectToken } = await searchParams;

  // Détection du pays via l'IP (header Cloudflare devant Railway, ou Vercel).
  // Sert à pré-remplir pays + langue de la carte. "XX"/"T1" (Tor) = inconnu.
  const h = await headers();
  const rawCountry = (
    h.get("cf-ipcountry") ??
    h.get("x-vercel-ip-country") ??
    ""
  ).toUpperCase();
  const detectedCountry =
    /^[A-Z]{2}$/.test(rawCountry) && rawCountry !== "XX" && rawCountry !== "T1"
      ? rawCountry
      : null;

  // Si un token prospect est fourni, on précharge ses infos pour
  // pré-remplir le formulaire et personnaliser l'accueil.
  let prospect: {
    nom: string;
    email: string;
    ville: string | null;
    logoUrl: string | null;
  } | null = null;

  if (prospectToken) {
    try {
      await ensureRuntimeSchema();
      const row = await prisma.prospectRestaurant.findUnique({
        where: { cardToken: prospectToken },
        select: {
          nom: true,
          email: true,
          ville: true,
          logoUrl: true,
          status: true,
        },
      });
      // On accepte seulement les prospects encore non-convertis
      if (row && row.status !== "converted") {
        prospect = {
          nom: row.nom,
          email: row.email,
          ville: row.ville,
          logoUrl: row.logoUrl,
        };
      }
    } catch (err) {
      console.warn("[signup-page] prospect lookup failed:", err);
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-mono)", color: "#26438A" }}
        >
          {prospect ? "Activation de votre carte" : "Inscription restaurateur"}
        </span>
        <h1
          className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-tight"
          style={{ color: "#0B1530" }}
        >
          {prospect ? `Bienvenue, ${prospect.nom}` : "Crée ton compte gratuit"}
        </h1>
        <p
          className="mt-2.5 text-sm leading-relaxed"
          style={{ color: "#4A5573" }}
        >
          {prospect
            ? "Votre carte digitale est prête. Créez votre compte en 30 secondes pour l'activer."
            : "14 jours d'essai Pro offerts, aucune carte bancaire requise."}
        </p>
      </div>

      {prospect && (
        <div
          className="flex items-center gap-3 rounded-xl border p-3"
          style={{ borderColor: "#D8E1F3", background: "#F4F7FE" }}
        >
          {prospect.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prospect.logoUrl}
              alt={prospect.nom}
              className="size-10 rounded-lg object-contain"
              style={{ border: "1px solid #D8E1F3", background: "#FFFFFF" }}
            />
          )}
          <div className="flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "#0B1530" }}
            >
              {prospect.nom}
              {prospect.ville && (
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: "#5e6b85" }}
                >
                  · {prospect.ville}
                </span>
              )}
            </p>
            <p
              className="text-xs"
              style={{ color: "#4A5573" }}
            >
              Carte pré-générée — modifiable juste après activation.
            </p>
          </div>
          <Sparkles className="size-4" style={{ color: "#26438A" }} />
        </div>
      )}

      <SignupForm
        prefill={
          prospect
            ? {
                email: prospect.email,
                prospectToken: prospectToken ?? "",
              }
            : undefined
        }
        defaultCountry={detectedCountry}
        googleEnabled={Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
        )}
      />
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
