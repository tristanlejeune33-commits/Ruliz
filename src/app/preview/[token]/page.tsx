import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  Check,
  ChefHat,
  ExternalLink,
  Globe2,
  Languages,
  QrCode,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import type { GeneratedCard } from "@/server/outreach/generate-card";
import { ActivationCta } from "./activation-cta";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { cardToken: token },
    select: { nom: true },
  });
  if (!prospect) return { title: "Carte introuvable" };
  return {
    title: `${prospect.nom} · Carte digitale par Ruliz`,
    description: `Découvrez la carte digitale interactive de ${prospect.nom} — propulsée par Ruliz, le SaaS qui transforme votre menu en expérience client moderne.`,
  };
}

export default async function PreviewPage({ params }: PageProps) {
  await ensureRuntimeSchema();
  const { token } = await params;

  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { cardToken: token },
    select: {
      id: true,
      nom: true,
      ville: true,
      adresse: true,
      telephone: true,
      siteWeb: true,
      logoUrl: true,
      photoCover: true,
      couleurDominante: true,
      cardJson: true,
      status: true,
      restaurantId: true,
    },
  });

  if (!prospect || !prospect.cardJson) notFound();

  // Track click asynchrone (n'attend pas)
  after(async () => {
    try {
      await prisma.$transaction([
        prisma.outreachEvent.create({
          data: {
            prospectId: prospect.id,
            type: "click",
            metadata: { source: "preview-page" },
          },
        }),
        prisma.prospectRestaurant.update({
          where: { id: prospect.id },
          data: {
            clickedAt: prospect.status === "sent" || prospect.status === "opened"
              ? new Date()
              : undefined,
            status:
              prospect.status === "sent" || prospect.status === "opened"
                ? "clicked"
                : undefined,
          },
        }),
      ]);
    } catch (err) {
      console.error("[preview] tracking failed:", err);
    }
  });

  const card = prospect.cardJson as unknown as GeneratedCard;
  const primaryColor = prospect.couleurDominante ?? "#26438A";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Bandeau prospect — "Cette carte vous attend" */}
      <div
        className="sticky top-0 z-30 border-b shadow-sm"
        style={{ background: primaryColor }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 shrink-0" />
              <span>
                <strong>{prospect.nom}</strong> · votre carte digitale est prête.
              </span>
            </div>
            <ActivationCta token={token} compact />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative">
        {prospect.photoCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prospect.photoCover}
            alt={prospect.nom}
            className="h-64 w-full object-cover sm:h-80"
          />
        )}
        <div className="mx-auto -mt-16 max-w-3xl px-4">
          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-start gap-4">
              {prospect.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prospect.logoUrl}
                  alt={`Logo ${prospect.nom}`}
                  className="size-16 rounded-lg object-contain ring-1 ring-slate-200"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {prospect.nom}
                </h1>
                {prospect.ville && (
                  <p className="mt-1 text-sm text-slate-600">
                    {prospect.adresse ? `${prospect.adresse} · ` : ""}
                    {prospect.ville}
                  </p>
                )}
                {prospect.telephone && (
                  <p className="mt-1 text-sm text-slate-500">
                    {prospect.telephone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bénéfices Ruliz */}
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Benefit icon={Languages} label="7 langues" />
          <Benefit icon={QrCode} label="QR code à table" />
          <Benefit icon={ChefHat} label="Allergènes" />
          <Benefit icon={Globe2} label="Photos HD" />
        </div>
      </section>

      {/* Menu */}
      <main className="mx-auto max-w-3xl space-y-10 px-4 pb-32">
        {card.categories.map((cat, ci) => (
          <section key={ci}>
            <h2
              className="mb-4 border-b pb-2 text-xl font-bold tracking-tight"
              style={{ borderColor: primaryColor }}
            >
              {cat.nom}
            </h2>
            <ul className="space-y-4">
              {cat.produits.map((p, pi) => (
                <li
                  key={pi}
                  className="flex justify-between gap-4 border-b border-dashed border-slate-200 pb-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{p.nom}</p>
                    {p.description && (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {p.description}
                      </p>
                    )}
                  </div>
                  {p.prix > 0 && (
                    <p className="shrink-0 text-base font-semibold tabular-nums">
                      {p.prix.toFixed(2).replace(".", ",")} €
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {/* Footer pre-CTA */}
      <section className="border-t bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">
            Activez votre carte en 2 minutes
          </h2>
          <p className="mt-2 text-slate-600">
            Cette démo a été générée automatiquement à partir de votre site.
            Activez votre compte pour la modifier, ajouter vos photos et générer
            votre QR code.
          </p>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <Feature label="Modifier votre carte en 2 clics" />
            <Feature label="Générer votre QR code instantanément" />
            <Feature label="Traduction automatique en 7 langues" />
            <Feature label="Statistiques de scans en temps réel" />
            <Feature label="Module fidélité et roulette" />
            <Feature label="Jeu d'avis Google intégré" />
          </div>

          <div className="mt-8">
            <ActivationCta token={token} />
            <p className="mt-3 text-xs text-slate-500">
              7 jours d&apos;essai gratuit · Sans engagement · Annulable à tout moment
            </p>
          </div>

          {prospect.siteWeb && (
            <p className="mt-6 text-xs text-slate-400">
              Carte générée automatiquement depuis{" "}
              <a
                href={prospect.siteWeb}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {new URL(
                  prospect.siteWeb.startsWith("http")
                    ? prospect.siteWeb
                    : `https://${prospect.siteWeb}`,
                ).hostname}
                <ExternalLink className="ml-0.5 inline size-3" />
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Sticky bottom CTA mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl sm:hidden">
        <ActivationCta token={token} full />
      </div>

      {/* Footer Ruliz */}
      <footer className="border-t bg-white px-4 py-6 text-center text-xs text-slate-500">
        <p>
          Propulsé par{" "}
          <Link
            href="https://ruliz-panel.fr"
            className="font-semibold text-slate-700 underline"
          >
            Ruliz
          </Link>{" "}
          · Le menu digital nouvelle génération pour restaurateurs
        </p>
      </footer>
    </div>
  );
}

function Benefit({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 p-3 text-center">
      <Icon className="size-5 text-slate-600" />
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-slate-700">
      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <span>{label}</span>
    </p>
  );
}
