"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  createCategorie,
  deleteCategorie,
  updateCategorie,
} from "@/server/dashboard/menu-actions";
import type { FlatCategorie, SerializedMenu } from "./types";

const NONE = "__none__";

const schema = z.object({
  titre: z.string().min(1, "Requis").max(255),
  icone: z.string().max(50),
  parentId: z.string(),
  modeAffichage: z.enum(["liste", "grille", "carrousel"]),
  affiche: z.boolean(),
});

type Values = z.infer<typeof schema>;

interface CategorieDrawerProps {
  restaurantId: string;
  categorie: FlatCategorie | null;
  /** Catégories top-level utilisables comme parent. */
  parents: SerializedMenu;
  onClose: () => void;
  onSaved: () => void;
}

export function CategorieDrawer({
  restaurantId,
  categorie,
  parents,
  onClose,
  onSaved,
}: CategorieDrawerProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!categorie;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: categorie?.titre ?? "",
      icone: categorie?.icone ?? "",
      parentId: categorie?.parentId ?? NONE,
      modeAffichage: categorie?.modeAffichage ?? "liste",
      affiche: categorie?.affiche ?? true,
    },
  });

  // Une catégorie qui a déjà des enfants ne peut pas devenir sous-catégorie
  // (on ne supporte qu'un niveau d'imbrication).
  const editingHasChildren =
    isEdit &&
    !!categorie &&
    parents.some((p) => p.id === categorie.id && p.children.length > 0);

  // Options de parent : top-level, exclut la cat en cours d'édition.
  const parentOptions = parents.filter((p) => p.id !== categorie?.id);

  const onSubmit = (values: Values) => {
    const parentId = values.parentId === NONE ? "" : values.parentId;
    startTransition(async () => {
      const res = isEdit && categorie
        ? await updateCategorie({ id: categorie.id, ...values, parentId })
        : await createCategorie({ restaurantId, ...values, parentId });

      if (res.ok) {
        toast.success(isEdit ? "Catégorie mise à jour" : "Catégorie créée");
        onSaved();
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!categorie) return;
    startTransition(async () => {
      const res = await deleteCategorie(categorie.id);
      if (res.ok) {
        toast.success("Catégorie supprimée");
        onSaved();
        onClose();
      } else toast.error(res.error);
    });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Éditer la catégorie" : "Nouvelle catégorie"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifie le nom, l'affichage ou l'icône."
              : "Donne un nom et choisis le mode d'affichage."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrées, Plats, Vins…" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icône (optionnelle)</FormLabel>
                  <FormControl>
                    <Input placeholder="salad, utensils, wine…" {...field} />
                  </FormControl>
                  <FormDescription>Nom d&apos;icône Lucide.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie parente</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editingHasChildren}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        Aucune (catégorie principale)
                      </SelectItem>
                      {parentOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {editingHasChildren
                      ? "Cette catégorie contient déjà des sous-catégories — elle doit rester principale."
                      : "Choisis une catégorie parente pour en faire une sous-catégorie."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modeAffichage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode d&apos;affichage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="liste">Liste verticale</SelectItem>
                      <SelectItem value="grille">Grille</SelectItem>
                      <SelectItem value="carrousel">Carrousel horizontal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Visible sur la carte publique uniquement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affiche"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                  <FormControl>
                    <Switch
                      id="affiche"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <Label htmlFor="affiche" className="cursor-pointer">
                      Visible sur la carte publique
                    </Label>
                    <FormDescription>
                      Décoche pour masquer (brouillon).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
              {isEdit && categorie ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="text-[var(--color-destructive)]">
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tous les produits qu&apos;elle contient ({categorie.produits.length})
                        seront aussi supprimés. Action irréversible.
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
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
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
