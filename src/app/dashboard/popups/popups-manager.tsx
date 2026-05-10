"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MoreHorizontal, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/shared/image-uploader";
import { Badge } from "@/components/ui/badge";
import {
  deletePopup,
  togglePopupActif,
  upsertPopup,
} from "@/server/dashboard/popup-actions";

interface PopupRow {
  id: string;
  titre: string | null;
  description: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  actif: boolean;
}

interface PopupsManagerProps {
  restaurantId: string;
  popups: PopupRow[];
}

export function PopupsManager({ restaurantId, popups }: PopupsManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<PopupRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await togglePopupActif(id);
      if (res.ok) {
        toast.success("Mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deletePopup(id);
      if (res.ok) {
        toast.success("Supprimé");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Bouton inline desktop, FAB mobile (cf. JSX en bas du return) */}
      <div className="hidden justify-end lg:flex">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          Nouveau pop-up
        </Button>
      </div>

      {popups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Aucun pop-up. Crée le premier pour annoncer un événement.
          </p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            Créer un pop-up
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {popups.map((p) => (
            <li key={p.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {p.imageUrl && (
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={p.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="truncate">{p.titre ?? "Sans titre"}</CardTitle>
                        <Badge variant={p.actif ? "success" : "secondary"}>
                          {p.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      {p.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {p.description}
                        </CardDescription>
                      )}
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        {p.dateDebut
                          ? format(parseISO(p.dateDebut), "d MMM yyyy", { locale: fr })
                          : "—"}
                        {" → "}
                        {p.dateFin
                          ? format(parseISO(p.dateFin), "d MMM yyyy", { locale: fr })
                          : "Sans fin"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={pending}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(p)}>
                          Éditer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(p.id)}>
                          {p.actif ? "Désactiver" : "Activer"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(p.id)}
                          className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
                        >
                          <Trash2 /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <PopupDialog
          restaurantId={restaurantId}
          popup={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {/* FAB mobile : "Nouveau pop-up" (le bouton inline est hidden lg:) */}
      <FAB
        icon={<Plus />}
        label="Nouveau pop-up"
        onClick={() => setEditing("new")}
      />
    </div>
  );
}

const schema = z.object({
  titre: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000),
  imageUrl: z.string().max(500),
  ctaLabel: z.string().max(100),
  ctaUrl: z.string().max(500),
  dateDebut: z.string(),
  dateFin: z.string(),
  actif: z.boolean(),
});
type Values = z.infer<typeof schema>;

function PopupDialog({
  restaurantId,
  popup,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  popup: PopupRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: popup?.titre ?? "",
      description: popup?.description ?? "",
      imageUrl: popup?.imageUrl ?? "",
      ctaLabel: popup?.ctaLabel ?? "",
      ctaUrl: popup?.ctaUrl ?? "",
      dateDebut: popup?.dateDebut ? popup.dateDebut.slice(0, 10) : "",
      dateFin: popup?.dateFin ? popup.dateFin.slice(0, 10) : "",
      actif: popup?.actif ?? true,
    },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await upsertPopup({
        restaurantId,
        id: popup?.id ?? null,
        titre: values.titre,
        description: values.description,
        imageUrl: values.imageUrl,
        ctaLabel: values.ctaLabel,
        ctaUrl: values.ctaUrl,
        dateDebut: values.dateDebut || null,
        dateFin: values.dateFin || null,
        actif: values.actif,
      });
      if (res.ok) {
        toast.success(popup ? "Pop-up mis à jour" : "Pop-up créé");
        onSaved();
        onClose();
      } else toast.error(res.error);
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{popup ? "Éditer le pop-up" : "Nouveau pop-up"}</DialogTitle>
          <DialogDescription>
            S&apos;affiche au chargement de la carte publique pendant la période active.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-5 md:grid-cols-[180px_1fr]"
          >
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
                  label="Image"
                />
              )}
            />
            <div className="space-y-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="ctaLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label du bouton</FormLabel>
                      <FormControl>
                        <Input placeholder="Réserver" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ctaUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL du bouton</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dateDebut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Début</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateFin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="actif"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                    <FormControl>
                      <Switch
                        id="popupActif"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label htmlFor="popupActif" className="cursor-pointer">
                      Afficher sur la carte publique
                    </Label>
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
