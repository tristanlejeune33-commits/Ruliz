import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  ExternalLink,
  FolderTree,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getMenuRefData, getMenuTree } from "@/server/dashboard/menu-queries";
import { serialize } from "@/lib/serialize";
import { MenuEditor } from "./menu-editor";
import { MenuFab } from "./menu-fab";
import { RetranslateButton } from "./retranslate-button";

export const metadata: Metadata = {
  title: "Éditeur de carte · Ruliz",
};

export default async function MenuEditorPage() {
  const { restaurant } = await getCurrentRestaurant();
  const [tree, refData] = await Promise.all([
    getMenuTree(restaurant.id),
    getMenuRefData(),
  ]);

  // Stats agrégées pour le slim header (catégories top-level + sous-cats + produits)
  const totalCats = tree.reduce(
    (sum, c) =>
      sum +
      1 +
      ((c as unknown as { children?: { id: string }[] }).children?.length ?? 0),
    0,
  );
  const totalProduits = tree.reduce((sum, c) => {
    const childrenProduits = (
      (c as unknown as { children?: { produits: unknown[] }[] }).children ?? []
    ).reduce((s, ch) => s + ch.produits.length, 0);
    return sum + c.produits.length + childrenProduits;
  }, 0);

  // Banner cold-start : affiché si la carte est quasi-vide (≤ 3 produits)
  const showImportBanner = totalProduits <= 3;

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-180px)] flex-col lg:-mx-6 lg:-my-8 lg:min-h-[calc(100vh-3.5rem)]">
      <header className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 size-64 rounded-full bg-[var(--accent)]/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-3 px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
              <UtensilsCrossed className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Éditeur de carte
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)] lg:text-lg">
                {restaurant.nom}
              </h1>
            </div>
            {/* Stats inline mobile (compact) */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 px-2 py-1 text-[11px] lg:hidden">
              <FolderTree className="size-3 text-[var(--text-muted)]" strokeWidth={1.75} />
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {totalCats}
              </span>
              <span aria-hidden className="text-[var(--text-muted)]/40">·</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {totalProduits}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Stats détaillées desktop */}
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 px-3 py-1.5 text-xs lg:flex">
              <FolderTree className="size-3.5 text-[var(--text-muted)]" />
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {totalCats}
              </span>
              <span className="text-[var(--text-muted)]">catégories</span>
              <span aria-hidden className="text-[var(--text-muted)]/40">·</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {totalProduits}
              </span>
              <span className="text-[var(--text-muted)]">produits</span>
            </div>

            {/* GROS CTA "Importer ma carte par photo" — full-width mobile, inline desktop */}
            <Button
              asChild
              size="sm"
              variant="primary"
              className="h-10 flex-1 gap-2 px-3.5 font-semibold lg:h-9 lg:flex-initial"
            >
              <Link href="/dashboard/menu/import">
                <Camera className="size-4" strokeWidth={1.75} />
                <span className="lg:hidden">Importer une photo</span>
                <span className="hidden lg:inline">Importer ma carte</span>
              </Link>
            </Button>

            <RetranslateButton restaurantId={restaurant.id.toString()} />
            <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
              <Link
                href={`/carte/${restaurant.id.toString()}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                Voir la carte publique
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* BANNER COLD-START : encore plus voyant si la carte est quasi vide */}
      {showImportBanner && <ImportColdStartBanner />}

      <MenuEditor
        restaurantId={restaurant.id.toString()}
        tree={serialize(tree)}
        vignettes={serialize(refData.vignettes)}
        allergenes={serialize(refData.allergenes)}
      />

      {/* FAB mobile : "Voir ma carte" (le bouton inline est hidden lg:) */}
      <MenuFab restaurantId={restaurant.id.toString()} />
    </div>
  );
}

/**
 * Banner cold-start : affiché en haut de l'éditeur quand la carte a 0–3
 * produits. Disparaît automatiquement dès que la carte est garnie.
 * Gradient cyan + icône camera + sous-texte sur la promesse "30s pour
 * digitaliser ta carte papier".
 */
function ImportColdStartBanner() {
  return (
    <div className="relative isolate overflow-hidden border-b border-[var(--neon-cyan)]/30 bg-gradient-to-r from-[var(--neon-cyan-soft)] via-[var(--neon-cyan)]/10 to-transparent">
      {/* Glow décoratif gauche */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-12 size-48 rounded-full bg-[var(--neon-cyan)]/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-3 px-4 py-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-5">
        <div className="flex items-start gap-3 lg:items-center lg:gap-4">
          {/* Icône camera tile */}
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--neon-cyan)] text-[var(--bg-primary)] shadow-[0_0_24px_var(--neon-cyan-glow)] lg:size-12">
            <Camera className="size-5 lg:size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)] lg:text-base">
                Importe ta carte par photo
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--neon-cyan)]">
                <Sparkles className="size-3" strokeWidth={2} />
                Magique
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)] lg:text-sm">
              Prends ta carte papier en photo · le système détecte tout seul catégories,
              plats, prix et allergènes en{" "}
              <strong className="font-semibold text-[var(--text-primary)]">
                30 secondes
              </strong>
              .
            </p>
          </div>
        </div>
        <Button asChild size="lg" variant="primary" className="w-full shrink-0 lg:w-auto">
          <Link href="/dashboard/menu/import">
            <Camera className="size-4" strokeWidth={1.75} />
            Importer ma carte ici
          </Link>
        </Button>
      </div>
    </div>
  );
}
