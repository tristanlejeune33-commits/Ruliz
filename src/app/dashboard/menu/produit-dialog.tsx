"use client";

import { useTransition } from "react";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ImageUploader } from "@/components/shared/image-uploader";
import {
  createProduit,
  deleteProduit,
  updateProduit,
} from "@/server/dashboard/menu-actions";
import type {
  SerializedAllergenes,
  SerializedCategorie,
  SerializedMenu,
  SerializedProduit,
  SerializedVignettes,
} from "./types";

/** Variante de prix : label (ex: "Demi", "Pinte") + prix décimal. */
const variantSchema = z.object({
  label: z.string().min(1, "Label requis").max(60),
  prix: z.number().nonnegative("Doit être positif"),
});

const schema = z.object({
  categorieId: z.string(),
  titre: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000),
  imageUrl: z.string().max(500),
  prix: z.union([z.number().nonnegative("Doit être positif"), z.literal("" as const)]),
  devise: z.string().max(5),
  descriptionPrix: z.string().max(255),
  /** Variantes de prix (max 8). Si non-vide, le prix simple est masqué. */
  prixVariantes: z.array(variantSchema).max(8),
  estNouveau: z.boolean(),
  origine: z.string().max(2),
  titreRemarque: z.string().max(255),
  descriptionRemarque: z.string().max(2000),
  vignettes: z.array(z.number().int()),
  allergenes: z.array(z.number().int()),
  /** IDs (string car BigInt) des produits à proposer comme "marier avec". */
  suggestions: z.array(z.string()),
  scheduleType: z.enum(["always", "lunch", "dinner", "happy_hour", "custom"]),
  scheduleStart: z.string().max(5),
  scheduleEnd: z.string().max(5),
  scheduleDays: z.string().min(1).max(7),
});

type Values = z.infer<typeof schema>;

interface ProduitDialogProps {
  mode: "edit" | "create";
  categorieId: string;
  categories: SerializedMenu;
  restaurantId: string;
  produit: SerializedProduit | null;
  vignettes: SerializedVignettes;
  allergenes: SerializedAllergenes;
  /** Devise par défaut du resto — utilisée pour les NOUVEAUX produits. */
  deviseDefault?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProduitDialog({
  mode,
  categorieId,
  categories,
  restaurantId,
  produit,
  vignettes,
  allergenes,
  deviseDefault = "€",
  onClose,
  onSaved,
}: ProduitDialogProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = mode === "edit" && produit;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      categorieId,
      titre: produit?.titre ?? "",
      description: produit?.description ?? "",
      imageUrl: produit?.imageUrl ?? "",
      prix: produit?.prix ?? "",
      // Nouveaux produits : héritent de la devise par défaut du resto
      // (configurée dans Mon restaurant) au lieu d'un "€" hardcodé.
      devise: produit?.devise ?? deviseDefault,
      descriptionPrix: produit?.descriptionPrix ?? "",
      prixVariantes: (() => {
        const raw = (produit as unknown as { prixVariantes?: unknown })
          ?.prixVariantes;
        if (!Array.isArray(raw)) return [];
        return raw
          .filter(
            (v): v is { label: string; prix: number } =>
              typeof v === "object" &&
              v !== null &&
              typeof (v as { label?: unknown }).label === "string" &&
              typeof (v as { prix?: unknown }).prix === "number",
          )
          .map((v) => ({ label: v.label, prix: v.prix }));
      })(),
      estNouveau: produit?.estNouveau ?? false,
      origine: produit?.origine ?? "",
      titreRemarque: produit?.titreRemarque ?? "",
      descriptionRemarque: produit?.descriptionRemarque ?? "",
      vignettes: produit?.vignettes.map((v) => v.vignetteId) ?? [],
      allergenes: produit?.allergenes.map((a) => a.allergeneId) ?? [],
      suggestions:
        (produit as unknown as {
          suggestionsIn?: Array<{ suggestionId: string | bigint }>;
        })?.suggestionsIn?.map((s) => s.suggestionId.toString()) ?? [],
      scheduleType:
        ((produit as unknown as { scheduleType?: string })?.scheduleType as
          | "always"
          | "lunch"
          | "dinner"
          | "happy_hour"
          | "custom") ?? "always",
      scheduleStart:
        (produit as unknown as { scheduleStart?: string })?.scheduleStart ?? "",
      scheduleEnd:
        (produit as unknown as { scheduleEnd?: string })?.scheduleEnd ?? "",
      scheduleDays:
        (produit as unknown as { scheduleDays?: string })?.scheduleDays ??
        "1234567",
    },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = isEdit
        ? await updateProduit({ id: produit.id, ...values })
        : await createProduit(values);
      if (res.ok) {
        toast.success(isEdit ? "Produit mis à jour" : "Produit créé");
        onSaved();
        onClose();
      } else toast.error(res.error);
    });
  };

  const onDelete = () => {
    if (!produit) return;
    startTransition(async () => {
      const res = await deleteProduit(produit.id);
      if (res.ok) {
        toast.success("Produit supprimé");
        onSaved();
        onClose();
      } else toast.error(res.error);
    });
  };

  /**
   * Liste plate (top-level + sous-catégories) permet d'assigner un produit
   * directement à une sous-catégorie depuis le dialog.
   */
  const flatCategories: SerializedCategorie[] = (() => {
    const out: SerializedCategorie[] = [];
    for (const cat of categories) {
      out.push(cat);
      const children =
        ((cat as unknown as { children?: SerializedCategorie[] }).children ?? []) as SerializedCategorie[];
      for (const child of children) out.push(child);
    }
    return out;
  })();

  const findCategorie = (id: string): SerializedCategorie | undefined =>
    flatCategories.find((c) => c.id === id);

  return (
    // DialogContent gère déjà : scroll interne, sticky header/footer,
    // bottom sheet mobile / modale desktop, bg opaque. On retire le
    // ScrollArea custom et on laisse le wrapper interne du DialogContent
    // (overflow-y-auto + px-5 mobile / px-0 lg) gérer le scroll.
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? produit.titre : "Nouveau produit"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6 md:grid-cols-[200px_1fr]"
          >
              {/* Image */}
              <div data-onboarding-anchor="produit-photo">
                <Label className="mb-2 block">Photo</Label>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <ImageUploader
                      value={field.value || null}
                      onChange={(url) => field.onChange(url ?? "")}
                      restaurantId={restaurantId}
                      kind="produit"
                      aspect="4/3"
                      label="Ajouter une photo"
                    />
                  )}
                />
              </div>

              <div className="grid gap-5">
                <FormField
                  control={form.control}
                  name="titre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>
                        Concise, appétissante. La traduction automatique conservera ton ton.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="prix"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Prix</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value === "" ? "" : String(field.value)}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? "" : Number(v));
                            }}
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categorieId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {flatCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.parentId ? `↳  ${c.titre}` : c.titre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="descriptionPrix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description du prix (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="Au verre 12cl : 14€" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* === VARIANTES DE PRIX (multi-volumes / multi-tailles) === */}
                <PrixVariantesField control={form.control} devise={form.watch("devise")} />

                <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-4">
                  <FormField
                    control={form.control}
                    name="estNouveau"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <Switch
                            id="nouveau"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label htmlFor="nouveau" className="cursor-pointer">
                          Marquer « Nouveau »
                        </Label>
                      </FormItem>
                    )}
                  />

                  {/* CRÉNEAU D'AFFICHAGE du produit (override de la catégorie) */}
                  <FormField
                    control={form.control}
                    name="scheduleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Créneau d&apos;affichage du produit
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            if (v === "custom") {
                              if (!form.getValues("scheduleStart"))
                                form.setValue("scheduleStart", "11:30");
                              if (!form.getValues("scheduleEnd"))
                                form.setValue("scheduleEnd", "15:00");
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="always">
                              Toujours (suit la catégorie)
                            </SelectItem>
                            <SelectItem value="lunch">
                              ☀️ Carte du midi (11h30-15h)
                            </SelectItem>
                            <SelectItem value="dinner">
                              🌙 Carte du soir (18h30-23h)
                            </SelectItem>
                            <SelectItem value="happy_hour">
                              🍹 Happy Hour (18h-19h)
                            </SelectItem>
                            <SelectItem value="custom">
                              🎯 Personnalisé
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[10px]">
                          Override la catégorie. Utile pour un cocktail visible
                          uniquement en happy hour dans une carte normalement
                          24/7.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {form.watch("scheduleType") === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="scheduleStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Début</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduleEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Fin</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Vignettes */}
                <div data-onboarding-anchor="produit-allergenes">
                  <Label>Vignettes</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vignettes.map((v) => {
                      const checked = form.watch("vignettes").includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const current = form.getValues("vignettes");
                            const next = checked
                              ? current.filter((id) => id !== v.id)
                              : [...current, v.id];
                            form.setValue("vignettes", next, { shouldDirty: true });
                          }}
                          className={
                            checked
                              ? "rounded-md border border-[var(--accent)] bg-[var(--accent)]/15 px-2 py-1 text-xs font-medium text-[var(--accent)]"
                              : "rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                          }
                        >
                          {v.labelFr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allergènes */}
                <div>
                  <Label>Allergènes</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {allergenes.map((a) => {
                      const checked = form.watch("allergenes").includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 px-2 py-1.5 text-xs"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const current = form.getValues("allergenes");
                              const next = value
                                ? [...current, a.id]
                                : current.filter((id) => id !== a.id);
                              form.setValue("allergenes", next, { shouldDirty: true });
                            }}
                          />
                          {a.labelFr}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* === Marier avec : suggestions d'accompagnement ===
                    Flat array de tous les produits du resto (sauf le produit
                    courant). Quand un client ouvre la modale produit sur la
                    carte publique, il voit les suggestions en bas avec un
                    "Marier avec : <plat 1>, <plat 2>..." */}
                <div>
                  <Label>Marier avec</Label>
                  <p className="mb-2 mt-1 text-xs text-[var(--text-muted)]">
                    Suggestions d&apos;accompagnement affichées à tes clients
                    dans la modale produit (ex: un plat suggère un vin).
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-2">
                    {(() => {
                      // Flat array de tous les produits du resto, en excluant
                      // le produit courant (pas de self-pairing).
                      const allProducts: Array<{ id: string; titre: string; catTitre: string }> = [];
                      categories.forEach((cat) => {
                        cat.produits.forEach((p) => {
                          if (!produit || p.id !== produit.id) {
                            allProducts.push({
                              id: p.id,
                              titre: p.titre,
                              catTitre: cat.titre,
                            });
                          }
                        });
                        cat.children?.forEach((subCat) => {
                          subCat.produits.forEach((p) => {
                            if (!produit || p.id !== produit.id) {
                              allProducts.push({
                                id: p.id,
                                titre: p.titre,
                                catTitre: `${cat.titre} › ${subCat.titre}`,
                              });
                            }
                          });
                        });
                      });

                      if (allProducts.length === 0) {
                        return (
                          <p className="px-2 py-3 text-xs text-[var(--text-muted)]">
                            Aucun autre produit à proposer. Crée d&apos;autres
                            plats pour les marier ensemble.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          {allProducts.map((p) => {
                            const checked = form
                              .watch("suggestions")
                              .includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--bg-glass-hover)]"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const current = form.getValues("suggestions");
                                    const next = value
                                      ? [...current, p.id]
                                      : current.filter((id) => id !== p.id);
                                    form.setValue("suggestions", next, {
                                      shouldDirty: true,
                                    });
                                  }}
                                />
                                <span className="flex-1 truncate font-medium">
                                  {p.titre}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  {p.catTitre}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Remarques */}
                <details className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Note spéciale (optionnel)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <FormField
                      control={form.control}
                      name="titreRemarque"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre de la note</FormLabel>
                          <FormControl>
                            <Input placeholder="Spécialité de la maison" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descriptionRemarque"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Texte</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </details>
              </div>
          </form>
        </Form>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="text-[var(--color-destructive)]">
                  <Trash2 className="size-3.5" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Action irréversible. Les traductions cachées seront aussi effacées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              {findCategorie(form.watch("categorieId"))?.titre}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Champ liste de variantes de prix pour les produits multi-volumes
 * (bière demi/pinte, vin verre/bouteille, planche petite/grande).
 *
 * UX :
 *   - Toggle pour activer/désactiver le mode multi-prix
 *   - Si activé : liste de (label + prix) avec bouton "+ Ajouter une taille"
 *   - Si > 0 variantes, le champ "Prix" simple devient indicatif (mais
 *     reste éditable pour rétrocompat par ex. la planche petite peut
 *     être le prix par défaut et la grande une variante).
 *   - 8 variantes max (largement suffisant pour tous les cas réels)
 *
 * Côté carte publique, si variantes définies, on affiche "dès X€" dans
 * la liste produits et le tableau complet dans la modal détail.
 */
function PrixVariantesField({
  control,
  devise,
}: {
  control: Control<Values>;
  devise: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "prixVariantes",
  });
  const hasVariantes = fields.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Plusieurs tailles / volumes ?
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Ex : bière (demi 3,50€ / pinte 6,50€) planche (petite 12€ /
            grande 24€) vin (verre 5€ / bouteille 28€).
          </p>
        </div>
        {!hasVariantes ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              append({ label: "Petite", prix: 0 });
              append({ label: "Grande", prix: 0 });
            }}
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
            Activer
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              // Retire toutes les variantes pour revenir au prix simple
              for (let i = fields.length - 1; i >= 0; i--) remove(i);
            }}
            className="text-[var(--text-tertiary)]"
          >
            Désactiver
          </Button>
        )}
      </div>

      {hasVariantes && (
        <>
          <ul className="space-y-2">
            {fields.map((f, i) => (
              <li
                key={f.id}
                className="grid grid-cols-[1fr_110px_40px] items-end gap-2"
              >
                <FormField
                  control={control}
                  name={`prixVariantes.${i}.label`}
                  render={({ field }) => (
                    <FormItem>
                      {i === 0 && (
                        <FormLabel className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          Taille / volume
                        </FormLabel>
                      )}
                      <FormControl>
                        <Input
                          placeholder="Ex : Demi Pinte Petite Grande"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`prixVariantes.${i}.prix`}
                  render={({ field }) => (
                    <FormItem>
                      {i === 0 && (
                        <FormLabel className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          Prix ({devise})
                        </FormLabel>
                      )}
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                          className="font-mono text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label="Supprimer cette variante"
                  className="self-end"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          {fields.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ label: "", prix: 0 })}
            >
              <Plus className="size-3.5" strokeWidth={1.75} />
              Ajouter une taille
            </Button>
          )}
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Côté carte publique, les clients verront « dès {devise}X » avec le
            détail au clic.
          </p>
        </>
      )}
    </div>
  );
}
