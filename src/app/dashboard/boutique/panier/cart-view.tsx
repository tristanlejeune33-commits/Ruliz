"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ImageOff,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  removeFromCartAction,
  setCartQuantityAction,
} from "@/server/dashboard/boutique-cart-actions";
import { createBoutiqueCommande } from "@/server/dashboard/boutique-actions";

interface CartItemView {
  produitId: string;
  quantite: number;
  totalCentimes: number;
  produit: {
    id: string;
    nom: string;
    slug: string;
    imageUrl: string | null;
    prixCentimes: number;
    devise: string;
  };
}

interface CartViewProps {
  items: CartItemView[];
  restaurants: Array<{ id: string; nom: string }>;
  defaultLivraison: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    pays: string;
    telephone: string;
  };
}

const NONE = "__none__";

const schema = z.object({
  restaurantId: z.string().optional(),
  livraisonNom: z.string().min(1, "Requis").max(255),
  livraisonAdresse: z.string().min(1, "Requis").max(500),
  livraisonCodePostal: z.string().max(10),
  livraisonVille: z.string().max(100),
  livraisonPays: z.string().max(100),
  livraisonTelephone: z.string().max(20).optional().or(z.literal("")),
  notesClient: z.string().max(2000).optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

export function CartView({
  items,
  restaurants,
  defaultLivraison,
}: CartViewProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const totalCentimes = useMemo(
    () => items.reduce((s, i) => s + i.totalCentimes, 0),
    [items],
  );
  const devise = items[0]?.produit.devise ?? "EUR";

  const updateQty = (produitId: string, newQty: number) => {
    setPendingId(produitId);
    startTransition(async () => {
      await setCartQuantityAction(produitId, newQty);
      setPendingId(null);
      router.refresh();
    });
  };

  const remove = (produitId: string) => {
    setPendingId(produitId);
    startTransition(async () => {
      await removeFromCartAction(produitId);
      setPendingId(null);
      router.refresh();
    });
  };

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      restaurantId: restaurants[0]?.id ?? NONE,
      livraisonNom: defaultLivraison.nom,
      livraisonAdresse: defaultLivraison.adresse,
      livraisonCodePostal: defaultLivraison.codePostal,
      livraisonVille: defaultLivraison.ville,
      livraisonPays: defaultLivraison.pays,
      livraisonTelephone: defaultLivraison.telephone,
      notesClient: "",
    },
  });

  const onSubmit = (values: Values) => {
    setSubmitting(true);
    startTransition(async () => {
      const res = await createBoutiqueCommande({
        items: items.map((i) => ({
          produitId: i.produitId,
          quantite: i.quantite,
        })),
        restaurantId:
          values.restaurantId === NONE ? "" : values.restaurantId ?? "",
        livraisonNom: values.livraisonNom,
        livraisonAdresse: values.livraisonAdresse,
        livraisonCodePostal: values.livraisonCodePostal,
        livraisonVille: values.livraisonVille,
        livraisonPays: values.livraisonPays,
        livraisonTelephone: values.livraisonTelephone,
        notesClient: values.notesClient,
      });
      setSubmitting(false);
      if (res.ok) {
        toast.success("Commande envoyée — un email de confirmation arrive");
        router.push("/dashboard/boutique/commandes");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* LISTE DES ITEMS */}
      <ul className="space-y-3">
        {items.map((item) => (
          <Card key={item.produitId} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-glass-strong)]">
                {item.produit.imageUrl ? (
                  <Image
                    src={item.produit.imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageOff
                    className="size-6 text-[var(--text-tertiary)]"
                    strokeWidth={1.75}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold tracking-tight text-[var(--text-primary)]">
                  {item.produit.nom}
                </h3>
                <p className="font-mono text-sm text-[var(--text-tertiary)]">
                  {(item.produit.prixCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: item.produit.devise,
                  })}{" "}
                  / unité
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={pendingId === item.produitId || item.quantite <= 1}
                    onClick={() => updateQty(item.produitId, item.quantite - 1)}
                  >
                    <Minus className="size-3" strokeWidth={2} />
                  </Button>
                  <span className="w-10 text-center font-mono text-sm tabular-nums">
                    {item.quantite}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={pendingId === item.produitId}
                    onClick={() => updateQty(item.produitId, item.quantite + 1)}
                  >
                    <Plus className="size-3" strokeWidth={2} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-mono text-base font-bold tabular-nums text-[var(--text-primary)]">
                  {(item.totalCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: item.produit.devise,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(item.produitId)}
                  disabled={pendingId === item.produitId}
                  aria-label="Retirer du panier"
                  className="text-[var(--neon-danger)] hover:bg-[var(--neon-danger-soft)]"
                >
                  {pendingId === item.produitId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </ul>

      {/* CHECKOUT */}
      <Card className="h-fit p-5 lg:sticky lg:top-[88px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <h2 className="text-base font-semibold tracking-tight">
              Livraison
            </h2>
            {restaurants.length > 0 && (
              <FormField
                control={form.control}
                name="restaurantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Aucun</SelectItem>
                        {restaurants.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">
                      Pour qu&apos;on imprime ton QR code unique.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="livraisonNom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du destinataire</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="livraisonAdresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="livraisonCodePostal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CP</FormLabel>
                    <FormControl>
                      <Input className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="livraisonVille"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="livraisonTelephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone (optionnel)</FormLabel>
                  <FormControl>
                    <Input className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notesClient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between border-t border-[var(--border-glass)] pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Total
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                  {(totalCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: devise,
                  })}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">HT</p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting || items.length === 0}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShoppingBag className="size-4" strokeWidth={1.75} />
              )}
              Passer commande ({items.length} article
              {items.length > 1 ? "s" : ""})
            </Button>
            <p className="text-center text-[10px] text-[var(--text-tertiary)]">
              On revient vers toi sous 24h pour le paiement et la livraison.
            </p>
          </form>
        </Form>
      </Card>
    </div>
  );
}
