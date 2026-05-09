"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShoppingBag } from "lucide-react";
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
import { createBoutiqueCommande } from "@/server/dashboard/boutique-actions";

interface ProduitData {
  id: string;
  nom: string;
  prixCentimes: number;
  devise: string;
}

interface CommandeFormProps {
  produit: ProduitData;
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
  quantite: z.number().int().positive("Min 1").max(1000, "Max 1000"),
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

export function CommandeForm({
  produit,
  restaurants,
  defaultLivraison,
}: CommandeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantite: 1,
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

  const quantite = form.watch("quantite") || 1;
  const total = produit.prixCentimes * quantite;

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await createBoutiqueCommande({
        produitId: produit.id,
        quantite: values.quantite,
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
      if (res.ok) {
        setSubmitted(true);
        toast.success("Commande envoyée — on revient vers toi sous 24h");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (submitted) {
    return (
      <Card className="space-y-3 p-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--neon-success-soft)] text-[var(--neon-success)]">
          <ShoppingBag className="size-5" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">
          Commande enregistrée ✦
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          On a bien reçu ta demande pour <strong>{quantite}× {produit.nom}</strong>.
          On revient vers toi sous 24h pour finaliser le paiement et la livraison.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/boutique/commandes">Voir mes commandes</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Quantité + Restaurant */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="quantite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      {...field}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value || "1", 10))
                      }
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>

          {/* Livraison */}
          <div className="space-y-3 rounded-lg border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Adresse de livraison
            </p>
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
                    <Input placeholder="12 rue des Lilas" {...field} />
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
                    <FormLabel>Code postal</FormLabel>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="livraisonPays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
          </div>

          <FormField
            control={form.control}
            name="notesClient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optionnel)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Mets mon logo en doré, livraison rapide svp…"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Total + bouton */}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-glass)] pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Total
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {(total / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: produit.devise,
                })}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">HT</p>
            </div>
            <Button
              type="submit"
              disabled={pending}
              variant="primary"
              size="lg"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShoppingBag className="size-4" strokeWidth={1.75} />
              )}
              Passer commande
            </Button>
          </div>
          <p className="text-center text-[10px] text-[var(--text-tertiary)]">
            La commande crée une demande — on te recontacte sous 24h pour le
            paiement et la livraison.
          </p>
        </form>
      </Form>
    </Card>
  );
}
