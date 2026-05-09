"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/shared/image-uploader";
import { importMenuFromImage } from "@/server/dashboard/menu-import-actions";

type Langue = "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";

interface ImportMenuFormProps {
  restaurantId: string;
  defaultLangue: Langue;
}

export function ImportMenuForm({
  restaurantId,
  defaultLangue,
}: ImportMenuFormProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [langue, setLangue] = useState<Langue>(defaultLangue);
  const [remplacerExistant, setRemplacerExistant] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleImport = () => {
    if (!imageUrl) {
      toast.error("Uploade d'abord une photo de ton menu.");
      return;
    }

    const toastId = toast.loading(
      "Analyse du menu en cours… (5-30 secondes)",
    );

    startTransition(async () => {
      const res = await importMenuFromImage({
        restaurantId,
        imageUrl,
        langue,
        remplacerExistant,
      });

      toast.dismiss(toastId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(
        `✅ ${res.data.categories} catégories + ${res.data.produits} produits importés`,
      );
      // Redirige vers l'éditeur de menu pour que l'utilisateur édite
      router.push("/dashboard/menu");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Colonne gauche : formulaire */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Photo du menu</CardTitle>
            <CardDescription>
              Prends une photo nette de ton menu papier, en cadrant le texte
              bien droit. Évite les ombres ou les flashs qui floutent.
              Format JPEG, PNG ou WebP. Max 5 MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              value={imageUrl}
              onChange={(url) => setImageUrl(url)}
              restaurantId={restaurantId}
              kind="produit"
              aspect="3/4"
              label="Choisir la photo du menu"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Options d&apos;import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">
                Langue du menu sur la photo
              </Label>
              <Select
                value={langue}
                onValueChange={(v) => setLangue(v as Langue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Aide Claude à lire correctement les caractères spéciaux.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
              <Switch
                id="remplacer"
                checked={remplacerExistant}
                onCheckedChange={setRemplacerExistant}
              />
              <div className="flex-1">
                <Label htmlFor="remplacer" className="cursor-pointer">
                  Remplacer le menu existant
                </Label>
                <p className="text-xs text-[var(--text-muted)]">
                  ⚠️ Supprime toutes tes catégories + produits actuels avant
                  l&apos;import. Sinon, l&apos;import s&apos;ajoute après.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline" disabled={pending}>
            <a href="/dashboard/menu">Annuler</a>
          </Button>
          <Button onClick={handleImport} disabled={!imageUrl || pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanText className="size-4" />
            )}
            Lancer l&apos;analyse
          </Button>
        </div>
      </div>

      {/* Colonne droite : explications */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Upload className="mr-1.5 inline size-4" />
              Comment ça marche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>
              <strong>1.</strong> Tu uploades une photo de ton menu (PNG/JPG).
            </p>
            <p>
              <strong>2.</strong> Claude Vision analyse l&apos;image et
              extrait : catégories, produits, descriptions, prix.
            </p>
            <p>
              <strong>3.</strong> Le menu est inséré dans ta carte. Tu peux
              ensuite tout éditer dans l&apos;éditeur classique.
            </p>
            <p className="rounded-md bg-[var(--bg-elevated)] p-3 text-xs">
              💡 <strong>Tip</strong> : pour de meilleurs résultats, prends la
              photo de ton menu posé à plat avec une lumière du jour. Évite
              les angles inclinés et les reflets.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coût estimé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            <p>
              ~$0.005 - $0.02 par menu importé (Anthropic Haiku Vision).
              Inclus dans ton abonnement Ruliz.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
