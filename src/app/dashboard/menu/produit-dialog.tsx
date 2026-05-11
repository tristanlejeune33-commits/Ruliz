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
  SerializedAllergenes,
  SerializedCategorie,
  SerializedMenu,
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
   * Liste plate (top-level + sous-catégories) — permet d'assigner un produit
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
