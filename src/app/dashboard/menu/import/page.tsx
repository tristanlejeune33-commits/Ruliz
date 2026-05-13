import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/active-restaurant";
import { ImportMenuForm } from "./import-form";

export const metadata: Metadata = {
  title: "Importer un menu Ruliz",
};

export default async function ImportMenuPage() {
  const { restaurant } = await getCurrentRestaurant();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">
            <ScanText className="size-3" /> Import par photo
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Importer ta carte depuis une photo
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Prends en photo ton menu papier (ou uploade un PDF page). Claude
            Vision lit l&apos;image et crée les catégories + produits + prix
            automatiquement. Tu peux ensuite éditer manuellement.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/menu">
            <ArrowLeft className="size-3.5" />
            Retour
          </Link>
        </Button>
      </header>

      <ImportMenuForm
        restaurantId={restaurant.id.toString()}
        defaultLangue={
          (restaurant.langueNative as
            | "fr"
            | "en"
            | "es"
            | "de"
            | "it"
            | "pt"
            | "zh") ?? "fr"
        }
      />
    </div>
  );
}
