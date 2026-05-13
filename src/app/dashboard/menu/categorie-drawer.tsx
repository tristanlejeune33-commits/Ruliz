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
import { SCHEDULE_OPTIONS } from "@/lib/schedule";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import type { SerializedCategorie } from "./types";

const DAYS_LABELS = [
  { num: "1", label: "L" },
  { num: "2", label: "M" },
  { num: "3", label: "M" },
  { num: "4", label: "J" },
  { num: "5", label: "V" },
  { num: "6", label: "S" },
  { num: "7", label: "D" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

const schema = z.object({
  titre: z.string().min(1, "Requis").max(255),
  icone: z.string().max(50),
  modeAffichage: z.enum(["liste", "grille", "carrousel"]),
  affiche: z.boolean(),
  /** "" = top-level, sinon ID de la catégorie parente */
  parentId: z.string(),
  /** Créneau d'affichage */
  scheduleType: z.enum(["always", "lunch", "dinner", "happy_hour", "custom"]),
  scheduleStart: z.string().max(5).optional().or(z.literal("")),
  scheduleEnd: z.string().max(5).optional().or(z.literal("")),
  scheduleDays: z.string().min(1).max(7),
  /** Couleur custom hex (vide = utilise le thème global du resto) */
  couleur: z.string().regex(HEX, "Format #RRGGBB").or(z.literal("")),
});

type Values = z.infer<typeof schema>;

interface CategorieDrawerProps {
  restaurantId: string;
  categorie: SerializedCategorie | null;
  /** Toutes les catégories du resto (pour le picker parent) */
  allCategories: SerializedCategorie[];
  onClose: () => void;
  onSaved: () => void;
}

export function CategorieDrawer({
  restaurantId,
  categorie,
  allCategories,
  onClose,
  onSaved,
}: CategorieDrawerProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!categorie;

  // Liste des parents possibles : top-level uniquement, exclut soi-même
  // (pour éviter une catégorie qui se référence elle-même).
  const possibleParents = allCategories.filter(
    (c) => !c.parentId && c.id !== categorie?.id,
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: categorie?.titre ?? "",
      icone: categorie?.icone ?? "",
      modeAffichage: categorie?.modeAffichage ?? "liste",
      affiche: categorie?.affiche ?? true,
      parentId: categorie?.parentId ?? "",
      scheduleType:
        (categorie?.scheduleType as
          | "always"
          | "lunch"
          | "dinner"
          | "happy_hour"
          | "custom") ?? "always",
      scheduleStart: categorie?.scheduleStart ?? "",
      scheduleEnd: categorie?.scheduleEnd ?? "",
      scheduleDays: categorie?.scheduleDays ?? "1234567",
      couleur: (categorie as unknown as { couleur?: string })?.couleur ?? "",
    },
  });

  const scheduleType = form.watch("scheduleType");
  const scheduleDays = form.watch("scheduleDays") || "1234567";

  const toggleDay = (day: string) => {
    const next = scheduleDays.includes(day)
      ? scheduleDays.split("").filter((d) => d !== day).join("")
      : (scheduleDays + day)
          .split("")
          .sort()
          .join("");
    form.setValue("scheduleDays", next || "1234567", { shouldDirty: true });
  };

  // Quand l'utilisateur passe en "custom", on pré-remplit avec des horaires
  // raisonnables (11:30-15:00) plutôt que de laisser vide. Évite le crash où
  // l'utilisateur sauvegarde "custom" sans start/end → catégorie invisible
  // mais sans message clair.
  const handleScheduleTypeChange = (value: string) => {
    form.setValue(
      "scheduleType",
      value as "always" | "lunch" | "dinner" | "happy_hour" | "custom",
      { shouldDirty: true },
    );
    if (value === "custom") {
      const currentStart = form.getValues("scheduleStart");
      const currentEnd = form.getValues("scheduleEnd");
      if (!currentStart) form.setValue("scheduleStart", "11:30");
      if (!currentEnd) form.setValue("scheduleEnd", "15:00");
    }
  };

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = isEdit && categorie
        ? await updateCategorie({ id: categorie.id, ...values })
        : await createCategorie({ restaurantId, ...values });

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
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Éditer la catégorie" : "Nouvelle catégorie"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifie le nom, l'affichage ou l'emoji."
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
                  <FormLabel>Emoji (optionnel)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <EmojiPicker onSelect={(e) => field.onChange(e)}>
                        <button
                          type="button"
                          className="flex h-10 w-14 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xl transition-colors hover:bg-[var(--bg-glass-hover)]"
                          aria-label="Choisir un emoji"
                        >
                          {field.value ? (
                            field.value
                          ) : (
                            <span className="text-[var(--text-tertiary)] text-base">
                              🍽️
                            </span>
                          )}
                        </button>
                      </EmojiPicker>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                        >
                          Retirer
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Affiché à côté du nom de la catégorie sur la carte
                    publique. Clic pour parcourir tous les emojis.
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

            {/* Parent picker : permet de transformer la catégorie en sous-cat */}
            {possibleParents.length > 0 && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie parente (optionnel)</FormLabel>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Catégorie principale (top-level)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          🏠 Catégorie principale (top-level)
                        </SelectItem>
                        {possibleParents.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            ↳ Sous-catégorie de {p.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sur la carte publique, les sous-catégories apparaissent en
                      JAUNE à l&apos;intérieur de leur catégorie parente. Idéal
                      pour structurer (ex: Vins ↳ Rouges / Blancs / Rosés).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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

            {/* COULEUR CUSTOM (override theme resto) */}
            <FormField
              control={form.control}
              name="couleur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur de la catégorie (optionnel)</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="color"
                        value={field.value || "#011255"}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="size-10 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-transparent"
                      />
                    </FormControl>
                    <Input
                      placeholder="#011255 (vide = couleur du resto)"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.onChange("")}
                        title="Réinitialiser"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    Override la couleur du thème global. Utile pour distinguer
                    visuellement une catégorie (ex: rouge pour les épicés).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CRÉNEAU D'AFFICHAGE — carte midi, soir, happy hour, custom */}
            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Créneau d&apos;affichage</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleScheduleTypeChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {SCHEDULE_OPTIONS.find((o) => o.value === scheduleType)
                      ?.hint ?? ""}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scheduleType === "custom" && (
              <div className="grid gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                <Label className="text-xs">Horaires personnalisés</Label>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="scheduleStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Début</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            value={field.value ?? ""}
                          />
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
                          <Input
                            type="time"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription className="text-[10px]">
                  Si la fin est avant le début (ex: 22h → 02h), la catégorie
                  passe minuit (service de nuit).
                </FormDescription>
              </div>
            )}

            {scheduleType !== "always" && (
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                <Label className="text-xs">Jours d&apos;affichage</Label>
                <p className="mb-2 text-[10px] text-[var(--text-muted)]">
                  Clic sur un jour pour l&apos;activer/désactiver.
                </p>
                <div className="flex gap-1.5">
                  {DAYS_LABELS.map((d) => {
                    const active = scheduleDays.includes(d.num);
                    return (
                      <button
                        key={d.num}
                        type="button"
                        onClick={() => toggleDay(d.num)}
                        className={`flex size-9 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                          active
                            ? "bg-[var(--accent)] text-[var(--accent-foreground,#fff)]"
                            : "border border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:border-[var(--accent)]"
                        }`}
                        aria-pressed={active}
                        aria-label={`Jour ${d.label}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
