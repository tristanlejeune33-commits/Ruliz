import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  Headphones,
  ImageOff,
  Leaf,
  RotateCcw,
  Shield,
  Sparkles,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serialize } from "@/lib/serialize";
import { getBoutiqueProduitBySlug } from "@/server/dashboard/boutique-queries";
import { AddToCartButton } from "./add-to-cart-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const produit = await getBoutiqueProduitBySlug(slug);
  return { title: `${produit?.nom ?? "Produit"} · Boutique Ruliz` };
}

export default async function BoutiqueProduitPage({ params }: PageProps) {
  const { slug } = await params;
  const produit = await getBoutiqueProduitBySlug(slug);
  if (!produit) notFound();

  const features = Array.isArray(produit.featuresJson)
    ? produit.featuresJson.filter((x): x is string => typeof x === "string")
    : [];

  const serialized = serialize(produit);
  const prixEuros = produit.prixCentimes / 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/boutique">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Boutique
          </Link>
        </Button>

        {/* Badge "Made in France" */}
        <Badge
          variant="default"
          className="bg-gradient-to-r from-[#0055A4] via-white via-50% to-[#EF4135] text-[10px] font-bold text-[#0055A4] shadow-sm ring-1 ring-black/5"
        >
          🇫🇷 Made in France
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* ============ COLONNE GAUCHE : IMAGE ============ */}
        <div className="space-y-3">
          <Card className="overflow-hidden p-0 ring-1 ring-[var(--border-subtle)]">
            <div className="relative aspect-square bg-gradient-to-br from-[var(--bg-glass-strong)] to-[var(--bg-elevated)]">
              {produit.imageUrl ? (
                <Image
                  src={produit.imageUrl}
                  alt={produit.nom}
                  width={900}
                  height={900}
                  unoptimized
                  className="size-full object-cover"
                  priority
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageOff
                    className="size-20 text-[var(--text-tertiary)]"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Sticker rond "Made in France" en bas à gauche */}
              <div className="absolute bottom-4 left-4 flex size-16 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white/40 sm:size-20">
                <div className="text-center leading-none">
                  <div className="text-[8px] font-bold uppercase tracking-wider text-[#0055A4] sm:text-[9px]">
                    Fabriqué
                  </div>
                  <div className="text-base sm:text-lg">🇫🇷</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-[#EF4135] sm:text-[9px]">
                    En France
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Garanties bandes */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <GarantieBadge
              icon={<Truck className="size-3.5" strokeWidth={1.75} />}
              label="Livraison 5j"
            />
            <GarantieBadge
              icon={<Shield className="size-3.5" strokeWidth={1.75} />}
              label="Paiement sécurisé"
            />
            <GarantieBadge
              icon={<RotateCcw className="size-3.5" strokeWidth={1.75} />}
              label="Retour 14j"
            />
            <GarantieBadge
              icon={<Headphones className="size-3.5" strokeWidth={1.75} />}
              label="Support FR"
            />
          </div>
        </div>

        {/* ============ COLONNE DROITE : DÉTAILS ============ */}
        <div className="space-y-6">
          {/* Header produit */}
          <div className="space-y-3">
            {produit.categorie && (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--neon-violet)]">
                <Award className="size-3" strokeWidth={2} />
                {produit.categorie}
              </p>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {produit.nom}
            </h1>

            {/* Prix mis en avant */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-4xl font-bold tabular-nums text-[var(--text-primary)]">
                {prixEuros.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: produit.devise,
                })}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                HT · TVA 20% incluse au paiement
              </span>
            </div>
          </div>

          {/* Description avec pop visuel */}
          {produit.description && (
            <Card className="border-l-4 border-l-[var(--accent)] bg-[var(--accent)]/5 p-4">
              <p className="text-pretty text-sm leading-relaxed text-[var(--text-primary)]">
                {produit.description}
              </p>
            </Card>
          )}

          {/* Features list — design amélioré */}
          {features.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                <Sparkles className="size-3" strokeWidth={2} />
                Ce que tu reçois
              </h2>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3 text-sm text-[var(--text-primary)]"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--neon-success-soft)]">
                      <Check
                        className="size-3 text-[var(--neon-success)]"
                        strokeWidth={3}
                      />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add to Cart */}
          <AddToCartButton
            produitId={serialized.id}
            produitNom={serialized.nom}
            stockRestant={produit.stockRestant}
          />

          {/* Argumentaire bas de fiche */}
          <Card className="space-y-3 bg-gradient-to-br from-[var(--bg-elevated)]/60 to-[var(--bg-glass)]/40 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              <Leaf className="size-3 text-[var(--neon-success)]" strokeWidth={2} />
              Pourquoi commander chez Ruliz ?
            </h3>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">→</span>
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Imprimé en France
                  </strong>{" "}
                  par un partenaire local — circuit court, emploi français
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">→</span>
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Ton QR code personnalisé
                  </strong>{" "}
                  avec ton logo et tes couleurs (configurés dans Mon resto)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">→</span>
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Valable à vie
                  </strong>{" "}
                  : ton QR pointe toujours vers ta carte à jour, change ta
                  carte 50 fois sans ré-imprimer
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">→</span>
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Paiement sécurisé
                  </strong>{" "}
                  par Stripe (carte bancaire, SEPA, Apple Pay)
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GarantieBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-2">
      <span className="text-[var(--accent)]">{icon}</span>
      <span className="text-[11px] font-medium text-[var(--text-primary)]">
        {label}
      </span>
    </div>
  );
}
