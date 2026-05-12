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
import { ImageUploader } from "@/components/shared/image-uploader";

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
  /** null = stock illimité */
  stockMax: number | null;
  /** Poids unitaire en grammes pour le calcul des frais de port Colissimo.
      0 = produit non concerné par les frais de port. */
  weightGrams?: number;
  /** Calculé : somme des items des commandes non annulées */
  stockUtilise?: number;
  /** Calculé : stockMax - stockUtilise (null si stockMax null) */
  stockRestant?: number | null;
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
  // null/empty = stock illimité ; sinon entier ≥ 0
  stockMax: z
    .union([z.number().int().nonnegative(), z.literal("" as const), z.null()])
    .optional(),
  // Grammage en g pour les frais de port (0 = produit dématérialisé / hors port)
  weightGrams: z.number().int().nonnegative().max(100000),
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
      stockMax: produit?.stockMax ?? "",
      weightGrams: produit?.weightGrams ?? 0,
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
      // stockMax peut être "" (illimité), null, ou un entier — normalise en
      // null pour le serveur (cohérent avec la colonne nullable Prisma).
      const stockMaxNormalized =
        values.stockMax === "" ||
        values.stockMax === null ||
        values.stockMax === undefined
          ? null
          : values.stockMax;

      const payload = {
        ...values,
        prixCentimes: Math.round(values.prixEuros * 100),
        stockMax: stockMaxNormalized,
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
            {/* Image produit — upload direct R2 (bucket "boutique/"), drag,
                copier-coller ou URL externe. Ratio 1:1 recommandé. */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo du produit</FormLabel>
                  <FormControl>
                    <div className="max-w-xs">
                      <ImageUploader
                        kind="boutique"
                        value={field.value || null}
                        onChange={(url) => field.onChange(url ?? "")}
                        aspect="1/1"
                        label="Ajouter une photo"
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Glisse, colle (Ctrl+V) ou clique pour uploader. Format
                    carré recommandé, max 5 MB.
                  </FormDescription>
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

            {/* Stock max — null/vide = illimité, sinon entier ≥ 0.
                Affichage du stock utilisé / restant en mode édition. */}
            <FormField
              control={form.control}
              name="stockMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock maximum</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Vide = illimité"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(
                          v === "" ? "" : Number.parseInt(v || "0", 10),
                        );
                      }}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Capacité totale en unités. Laisse vide pour stock
                    illimité.
                    {isEdit && produit?.stockUtilise !== undefined && (
                      <>
                        {" "}
                        <span className="font-mono text-[var(--text-secondary)]">
                          · {produit.stockUtilise} unité
                          {produit.stockUtilise > 1 ? "s" : ""} déjà commandée
                          {produit.stockUtilise > 1 ? "s" : ""}
                        </span>
                        {produit.stockRestant !== null &&
                          produit.stockRestant !== undefined && (
                            <span
                              className={`ml-1 font-mono ${
                                produit.stockRestant === 0
                                  ? "text-[var(--neon-danger)]"
                                  : produit.stockRestant <= 10
                                    ? "text-[var(--neon-violet)]"
                                    : "text-[var(--neon-success)]"
                              }`}
                            >
                              · {produit.stockRestant} restant
                              {produit.stockRestant > 1 ? "s" : ""}
                            </span>
                          )}
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grammage produit (g) — utilisé pour calculer les frais de port
                Colissimo à la commande. 0 = produit dématérialisé. */}
            <FormField
              control={form.control}
              name="weightGrams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grammage (g)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      placeholder="ex : 250"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value || "0", 10))
                      }
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Poids unitaire du produit en grammes. Sert au calcul
                    automatique des frais de port (paliers Colissimo
                    configurés dans /admin/boutique). Mets 0 si le produit
                    est dématérialisé.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
