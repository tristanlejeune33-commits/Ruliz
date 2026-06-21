"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardType, ImageIcon, Loader2, ScanText, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ImageUploader } from "@/components/shared/image-uploader";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import {
  importMenuFromImage,
  importMenuFromText,
} from "@/server/dashboard/menu-import-actions";

type Langue = "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";
type Mode = "photo" | "texte";

interface ImportMenuFormProps {
  restaurantId: string;
  defaultLangue: Langue;
}

export function ImportMenuForm({
  restaurantId,
  defaultLangue,
}: ImportMenuFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("photo");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [langue, setLangue] = useState<Langue>(defaultLangue);
  const [remplacerExistant, setRemplacerExistant] = useState(false);
  const [pending, startTransition] = useTransition();

  const canSubmit =
    mode === "photo" ? Boolean(imageUrl) : text.trim().length >= 10;

  const handleImport = () => {
    if (!canSubmit) {
      toast.error(
        mode === "photo"
          ? "Ajoute d'abord une photo (ou une URL) de ton menu."
          : "Colle d'abord le texte de ton menu.",
      );
      return;
    }

    const toastId = toast.loading("Analyse du menu en cours… (5-30 secondes)");

    startTransition(async () => {
      const res =
        mode === "photo"
          ? await importMenuFromImage({
              restaurantId,
              imageUrl: imageUrl as string,
              langue,
              remplacerExistant,
            })
          : await importMenuFromText({
              restaurantId,
              text,
              langue,
              remplacerExistant,
            });

      toast.dismiss(toastId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(
        `✅ ${res.data.categories} cat. + ${res.data.produits} produits + ${res.data.vignettes} tags + ${res.data.allergenes} allergènes`,
      );
      router.push("/dashboard/menu");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Colonne gauche : formulaire */}
      <div className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="photo">
              <ImageIcon className="size-3.5" /> Photo / PDF
            </TabsTrigger>
            <TabsTrigger value="texte">
              <ClipboardType className="size-3.5" /> Coller le texte
            </TabsTrigger>
          </TabsList>

          {/* --- Mode PHOTO --- */}
          <TabsContent value="photo">
            <Card>
              <CardHeader>
                <CardTitle>1. Photo du menu</CardTitle>
                <CardDescription>
                  Prends une photo nette de ton menu (ou colle une URL d&apos;image
                  / PDF). Cadre le texte bien droit, évite ombres et reflets.
                  JPEG, PNG, WebP ou PDF. Max 8 MB.
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
          </TabsContent>

          {/* --- Mode TEXTE --- */}
          <TabsContent value="texte">
            <Card>
              <CardHeader>
                <CardTitle>1. Texte du menu</CardTitle>
                <CardDescription>
                  Copie-colle le contenu de ton menu (depuis ton site web, un
                  PDF, un Word…). C&apos;est la méthode la plus fiable : Claude
                  structure le texte en catégories, produits et prix.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  placeholder={
                    "Entrées\nFoie gras maison — 18,50€\nServi avec confit d'oignon et toast brioché\n\nPlats\nMagret de canard — 24€\n…"
                  }
                  className="font-mono text-sm"
                />
                <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                  {text.trim().length} caractères. Inutile de mettre en forme :
                  colle tel quel, Claude s&apos;occupe de la structure.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>2. Options d&apos;import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">Langue du menu</Label>
              <Select
                value={langue}
                onValueChange={(v) => setLangue(v as Langue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGS.map((l) => (
                    <SelectItem key={l} value={l}>
                      <span className="flex items-center gap-2">
                        <FlagIcon lang={l} width={18} rounded />
                        {LANG_META[l].name}
                      </span>
                    </SelectItem>
                  ))}
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
          <Button onClick={handleImport} disabled={!canSubmit || pending}>
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
              <strong>1.</strong> Choisis une photo/PDF de ton menu, ou colle
              directement son texte.
            </p>
            <p>
              <strong>2.</strong> Claude analyse et extrait : catégories,
              produits, descriptions, prix, allergènes.
            </p>
            <p>
              <strong>3.</strong> Le menu est inséré dans ta carte. Tu peux
              ensuite tout éditer dans l&apos;éditeur classique.
            </p>
            <p className="rounded-md bg-[var(--bg-elevated)] p-3 text-xs">
              💡 <strong>Tip</strong> : si une photo passe mal (reflet, écriture
              manuscrite), bascule sur « Coller le texte » — c&apos;est le plus
              fiable.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
