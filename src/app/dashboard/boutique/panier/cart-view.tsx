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
import { createBoutiqueCheckoutSession } from "@/server/dashboard/boutique-checkout-actions";

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
    /** Grammage (g) du produit · passé par la query côté serveur. */
    weightGrams?: number;
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
  shipping: {
    feeCentimes: number;
    freeThresholdCentimes: number;
    label: string;
    active: boolean;
    tiers: Array<{
      id: string;
      maxGrams: number;
      feeCentimes: number;
      label: string;
      position: number;
    }>;
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
  shipping,
}: CartViewProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const subtotalCentimes = useMemo(
    () => items.reduce((s, i) => s + i.totalCentimes, 0),
    [items],
  );

  // Poids total du panier en grammes (somme des grammages × qty).
  // Affiché à côté des frais de port et utilisé pour trouver le palier.
  const totalWeightGrams = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + (i.produit.weightGrams ?? 0) * i.quantite,
        0,
      ),
    [items],
  );

  // Calcul shipping côté client (mirror exact du calcShippingCentimes
  // serveur · paliers triés par poids croissant, on prend le 1er dont
  // maxGrams ≥ poids total, sinon le dernier palier).
  const shippingCentimes = useMemo(() => {
    if (!shipping.active) return 0;
    if (
      shipping.freeThresholdCentimes > 0 &&
      subtotalCentimes >= shipping.freeThresholdCentimes
    ) {
      return 0;
    }
    if (shipping.tiers.length === 0) {
      return shipping.feeCentimes;
    }
    const sorted = [...shipping.tiers].sort(
      (a, b) => a.maxGrams - b.maxGrams,
    );
    const tier =
      sorted.find((t) => totalWeightGrams <= t.maxGrams) ??
      sorted[sorted.length - 1];
    return tier?.feeCentimes ?? shipping.feeCentimes;
  }, [shipping, subtotalCentimes, totalWeightGrams]);
  const totalCentimes = subtotalCentimes + shippingCentimes;
  const devise = items[0]?.produit.devise ?? "EUR";

  // Libellé du palier actif (ex: "Colissimo · 750 g")
  const activeTierLabel = useMemo(() => {
    if (!shipping.active || shippingCentimes === 0) return null;
    if (shipping.tiers.length === 0) return null;
    const sorted = [...shipping.tiers].sort(
      (a, b) => a.maxGrams - b.maxGrams,
    );
    const tier =
      sorted.find((t) => totalWeightGrams <= t.maxGrams) ??
      sorted[sorted.length - 1];
    return tier?.label || `Jusqu'à ${tier?.maxGrams ?? 0} g`;
  }, [shipping, shippingCentimes, totalWeightGrams]);

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
      // 1. Crée la commande en DB (statut "en_attente")
      const commandeRes = await createBoutiqueCommande({
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

      if (!commandeRes.ok) {
        setSubmitting(false);
        toast.error(commandeRes.error);
        return;
      }
      if (!commandeRes.data?.id) {
        setSubmitting(false);
        toast.error("Commande créée mais ID introuvable");
        return;
      }

      // 2. Crée la session Stripe Checkout pour cette commande
      const checkoutRes = await createBoutiqueCheckoutSession(
        commandeRes.data.id,
      );
      setSubmitting(false);

      if (checkoutRes.ok && checkoutRes.checkoutUrl) {
        // 3. Redirige direct vers Stripe (l'utilisateur reviendra sur la page
        //    commande via success_url / cancel_url définies côté serveur)
        window.location.href = checkoutRes.checkoutUrl;
      } else {
        // Si Stripe pas configuré ou autre erreur : la commande EST créée
        // (paiement à régler manuellement), on redirige vers la page commande
        toast.error(
          checkoutRes.ok ? "Paiement indisponible" : checkoutRes.error,
        );
        router.push(
          `/dashboard/boutique/commandes/${commandeRes.data.id}`,
        );
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

            {/* Récap chiffré : sous-total + frais de port + total */}
            <div className="space-y-1.5 border-t border-[var(--border-glass)] pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Sous-total</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {(subtotalCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: devise,
                  })}
                </span>
              </div>
              {shipping.active && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {shipping.label}
                    {activeTierLabel && (
                      <span className="ml-1.5 text-[10px] font-mono text-[var(--text-tertiary)]">
                        · {activeTierLabel}
                        {totalWeightGrams > 0 && (
                          <> · {totalWeightGrams} g</>
                        )}
                      </span>
                    )}
                  </span>
                  {shippingCentimes === 0 ? (
                    <span className="font-mono tabular-nums font-semibold text-[var(--neon-success)]">
                      Offerts ✓
                    </span>
                  ) : (
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      +{" "}
                      {(shippingCentimes / 100).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: devise,
                      })}
                    </span>
                  )}
                </div>
              )}
              {shipping.active &&
                shipping.freeThresholdCentimes > 0 &&
                shippingCentimes > 0 && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    💡 Livraison offerte à partir de{" "}
                    {(shipping.freeThresholdCentimes / 100).toLocaleString(
                      "fr-FR",
                      { style: "currency", currency: devise },
                    )}{" "}
                    (encore{" "}
                    {(
                      (shipping.freeThresholdCentimes - subtotalCentimes) /
                      100
                    ).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: devise,
                    })}
                    )
                  </p>
                )}
            </div>

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
              {submitting
                ? "Redirection vers le paiement…"
                : `Payer ${(totalCentimes / 100).toLocaleString("fr-FR", { style: "currency", currency: items[0]?.produit.devise ?? "EUR" })}`}
            </Button>
            <p className="flex items-center justify-center gap-1 text-center text-[10px] text-[var(--text-tertiary)]">
              🔒 Paiement sécurisé Stripe · CB / SEPA / Apple Pay
            </p>
            <p className="text-center text-[10px] text-[var(--text-tertiary)]">
              Tu seras redirigé vers la page de paiement sécurisée Stripe.
              Facture PDF disponible après paiement.
            </p>
          </form>
        </Form>
      </Card>
    </div>
  );
}
