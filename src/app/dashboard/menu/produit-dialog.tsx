"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FlatCategorie,
  SerializedAllergenes,
  SerializedProduit,
  SerializedVignettes,
} from "./types";

const schema = z.object({
  categorieId: z.string(),
  titre: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000),
  imageUrl: z.string().max(500),
  prix: z.union([z.number().nonnegative("Doit être positif"), z.literal("" as const)]),
  devise: z.string().max(5),
  descriptionPrix: z.string().max(255),
  estNouveau: z.boolean(),
  origine: z.string().max(2),
  titreRemarque: z.string().max(255),
  descriptionRemarque: z.string().max(2000),
  vignettes: z.array(z.number().int()),
  allergenes: z.array(z.number().int()),
});

type Values = z.infer<typeof schema>;

interface ProduitDialogProps {
  mode: "edit" | "create";
  categorieId: string;
  /** Liste plate de toutes les catégories (top-level + sous-catégories). */
  categories: FlatCategorie[];
  restaurantId: string;
  produit: SerializedProduit | null;
  vignettes: SerializedVignettes;
  allergenes: SerializedAllergenes;
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
      devise: produit?.devise ?? "€",
      descriptionPrix: produit?.descriptionPrix ?? "",
      estNouveau: produit?.estNouveau ?? false,
      origine: produit?.origine ?? "",
      titreRemarque: produit?.titreRemarque ?? "",
      descriptionRemarque: produit?.descriptionRemarque ?? "",
      vignettes: produit?.vignettes.map((v) => v.vignetteId) ?? [],
      allergenes: produit?.allergenes.map((a) => a.allergeneId) ?? [],
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

  const findCategorie = (id: string): FlatCategorie | undefined =>
    categories.find((c) => c.id === id);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-[var(--border-subtle)] p-6">
          <DialogTitle>{isEdit ? produit.titre : "Nouveau produit"}</DialogTitle>
          <DialogDescription>
            Toute modification supprime les traductions cachées — elles seront
            re-générées par Anthropic à la prochaine consultation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-6 p-6 md:grid-cols-[200px_1fr]"
            >
              {/* Image */}
              <div>
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
                        Concise, appétissante. La traduction IA conservera ton ton.
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
                            {categories.map((c) => (
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
                  <FormField
                    control={form.control}
                    name="origine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Origine (ISO 2)</FormLabel>
                        <FormControl>
                          <Input
                            maxLength={2}
                            placeholder="FR"
                            className="uppercase"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Vignettes */}
                <div>
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
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] p-4">
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
