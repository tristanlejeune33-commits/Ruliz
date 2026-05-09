import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FolderTree, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { getMenuRefData, getMenuTree } from "@/server/dashboard/menu-queries";
import { serialize } from "@/lib/serialize";
import { MenuEditor } from "./menu-editor";
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

  // Stats agrégées pour le slim header
  const totalCats = tree.reduce((sum, c) => sum + 1 + c.children.length, 0);
  const totalProduits = tree.reduce(
    (sum, c) =>
      sum +
      c.produits.length +
      c.children.reduce((s, ch) => s + ch.produits.length, 0),
    0,
  );

  const carteUrl = `/carte/${restaurant.id.toString()}`;

  return (
    <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] flex-col">
      <header className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 size-64 rounded-full bg-[var(--accent)]/8 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
              <UtensilsCrossed className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Éditeur de carte
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {restaurant.nom}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 px-3 py-1.5 text-xs sm:flex">
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
            <RetranslateButton restaurantId={restaurant.id.toString()} />
            <Button asChild variant="outline" size="sm">
              <Link href={carteUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Voir la carte
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <MenuEditor
        restaurantId={restaurant.id.toString()}
        tree={serialize(tree)}
        vignettes={serialize(refData.vignettes)}
        allergenes={serialize(refData.allergenes)}
      />
    </div>
  );
}
