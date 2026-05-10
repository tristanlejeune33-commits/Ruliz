"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createBoutiqueProduit,
  deleteBoutiqueProduit,
  updateBoutiqueProduit,
} from "@/server/admin/boutique/actions";

export interface SerializedBoutiqueProduit {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  prixCentimes: number;
  devise: string;
  imageUrl: string | null;
  categorie: string | null;
  position: number;
  statut: "brouillon" | "publie" | "archive";
  featuresJson: unknown;
}

const schema = z.object({
  nom: z.string().min(1, "Requis").max(255),
  slug: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  prixEuros: z.number().nonnegative("Doit être positif"),
  devise: z.string().max(3),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  categorie: z.string().max(100).optional().or(z.literal("")),
  position: z.number().int().nonnegative(),
  statut: z.enum(["brouillon", "publie", "archive"]),
});

type Values = z.infer<typeof schema>;

interface ProduitDrawerProps {
  produit: SerializedBoutiqueProduit | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProduitDrawer({ produit, onClose, onSaved }: ProduitDrawerProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!produit;

  // Convert features from JSON to string array
  const initialFeatures = (() => {
    if (!produit?.featuresJson) return [] as string[];
    if (Array.isArray(produit.featuresJson)) {
      return produit.featuresJson.filter(
        (x): x is string => typeof x === "string",
      );
    }
    return [];
  })();

  const [features, setFeatures] = useState<string[]>(initialFeatures);
  const [featureInput, setFeatureInput] = useState("");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: produit?.nom ?? "",
      slug: produit?.slug ?? "",
      description: produit?.description ?? "",
      prixEuros: produit ? produit.prixCentimes / 100 : 0,
      devise: produit?.devise ?? "EUR",
      imageUrl: produit?.imageUrl ?? "",
      categorie: produit?.categorie ?? "",
      position: produit?.position ?? 0,
      statut: produit?.statut ?? "brouillon",
    },
  });

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    if (features.includes(trimmed)) return;
    setFeatures([...features, trimmed]);
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const payload = {
        ...values,
        prixCentimes: Math.round(values.prixEuros * 100),
        features,
      };
      const res =
        isEdit && produit
          ? await updateBoutiqueProduit({ id: produit.id, ...payload })
          : await createBoutiqueProduit(payload);
      if (res.ok) {
        toast.success(isEdit ? "Produit mis à jour" : "Produit créé");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!produit) return;
    startTransition(async () => {
      const res = await deleteBoutiqueProduit(produit.id);
      if (res.ok) {
        toast.success("Produit supprimé");
        onSaved();
      } else toast.error(res.error);
    });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Éditer le produit" : "Nouveau produit"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifie les informations du produit."
              : "Ajoute un produit au catalogue de la boutique QR."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            {/* Image — URL directe (l'upload R2 demande un resto, pas pertinent ici) */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la photo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://… (R2, Imgur, Cloudinary)"
                      {...field}
                      className="font-mono text-xs"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Ratio 1:1 recommandé. Upload l&apos;image sur R2 / Imgur puis
                    colle l&apos;URL ici.
                  </FormDescription>
                  {field.value && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={field.value}
                      alt="Aperçu"
                      className="mt-2 size-32 rounded-md border border-[var(--border-glass)] object-cover"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du produit</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Set de table imprimé 100×"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="set-de-table-100x"
                        {...field}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Auto-généré depuis le nom si vide.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categorie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Sets de table, Stickers, Vitrine…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="100 sets de table avec ton QR code unique. Format A4, pelliculage mat."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="prixEuros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number.parseFloat(e.target.value || "0"))
                        }
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="devise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number.parseInt(e.target.value || "0", 10))
                        }
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Tri ascendant.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="statut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="brouillon">
                        Brouillon — invisible aux clients
                      </SelectItem>
                      <SelectItem value="publie">
                        Publié — visible et commandable
                      </SelectItem>
                      <SelectItem value="archive">
                        Archivé — invisible mais conservé
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Features — état local, pas un champ react-hook-form, donc on
                utilise <Label> standard et un <p> au lieu de FormLabel /
                FormDescription qui exigent un <FormField> parent. */}
            <div className="space-y-2">
              <Label>Caractéristiques (bullet list)</Label>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Ex : « 100 unités », « Format A4 », « Pelliculage mat ». Affiché
                en liste sur la fiche produit.
              </p>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Tape une caractéristique puis Entrée"
                />
                <Button type="button" size="sm" variant="outline" onClick={addFeature}>
                  <Plus className="size-3.5" strokeWidth={2} />
                </Button>
              </div>
              {features.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {features.map((f, idx) => (
                    <li
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-glass)] bg-[var(--bg-glass)] px-2 py-0.5 text-xs"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--neon-danger)]"
                        aria-label={`Retirer ${f}`}
                      >
                        <X className="size-2.5" strokeWidth={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-glass)] pt-4">
              {isEdit && produit ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[var(--neon-danger)]"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Action irréversible. Si des commandes existent pour ce
                        produit, la suppression sera refusée — archive-le à la
                        place.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={pending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {isEdit ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
