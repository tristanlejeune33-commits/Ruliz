import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
        <div>
          <Badge variant="secondary">Éditeur de carte</Badge>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight">
            {restaurant.nom}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <RetranslateButton restaurantId={restaurant.id.toString()} />
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/carte/${restaurant.id.toString()}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Voir la carte publique
            </Link>
          </Button>
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
