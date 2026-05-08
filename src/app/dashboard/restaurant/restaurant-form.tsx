"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { updateRestaurant } from "@/server/dashboard/actions";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const schema = z.object({
  nom: z.string().min(1, "Requis").max(255),
  email: z.string().max(255),
  telephone: z.string().max(20),
  adresse: z.string().max(500),
  codePostal: z.string().max(10),
  ville: z.string().max(100),
  pays: z.string().max(100),
  couleurPrimaire: z.union([z.string().regex(HEX_COLOR, "Format #RRGGBB"), z.literal("")]),
  couleurSecondaire: z.union([z.string().regex(HEX_COLOR, "Format #RRGGBB"), z.literal("")]),
  facebookUrl: z.string().max(500),
  instagramUrl: z.string().max(500),
  tiktokUrl: z.string().max(500),
  siteWeb: z.string().max(500),
  googleReviewUrl: z.string().max(500),
  logoUrl: z.string().max(500),
  banniereUrl: z.string().max(500),
});

type Values = z.infer<typeof schema>;

interface RestaurantFormProps {
  restaurant: { id: string } & Values;
}

export function RestaurantForm({ restaurant }: RestaurantFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: restaurant,
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await updateRestaurant({ id: restaurant.id, ...values });
      if (res.ok) {
        toast.success("Restaurant mis à jour");
        form.reset(values);
      } else toast.error(res.error);
    });
  };

  const logoUrl = form.watch("logoUrl");
  const banniereUrl = form.watch("banniereUrl");
  const couleurPrimaire = form.watch("couleurPrimaire");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="infos">
          <TabsList>
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="social">Réseaux</TabsTrigger>
          </TabsList>

          <TabsContent value="infos">
            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
                <CardDescription>
                  Ces informations apparaissent dans le footer de la carte publique.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nom du restaurant</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de contact</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="codePostal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ville"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pays"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo et bannière</CardTitle>
                <CardDescription>
                  Logo carré, bannière en hero. Upload R2 arrive prochainement — colle
                  une URL pour l&apos;instant.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Logo</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Logo"
                        width={200}
                        height={200}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="text-center text-xs text-[var(--text-muted)]">
                        <Upload className="mx-auto mb-2 size-6" />
                        Aucun logo
                      </div>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="https://…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Bannière</p>
                  <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
                    {banniereUrl ? (
                      <Image
                        src={banniereUrl}
                        alt="Bannière"
                        width={400}
                        height={225}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="text-center text-xs text-[var(--text-muted)]">
                        <Upload className="mx-auto mb-2 size-6" />
                        Aucune bannière
                      </div>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="banniereUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="https://…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Couleurs</CardTitle>
                <CardDescription>
                  Couleur primaire utilisée sur les CTA de la carte publique.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="couleurPrimaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur primaire</FormLabel>
                      <div className="flex items-center gap-3">
                        <div
                          className="size-10 shrink-0 rounded-md border border-[var(--border-subtle)]"
                          style={{ backgroundColor: couleurPrimaire || "transparent" }}
                          aria-hidden
                        />
                        <FormControl>
                          <Input className="font-mono" placeholder="#4870e0" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="couleurSecondaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur secondaire (optionnelle)</FormLabel>
                      <FormControl>
                        <Input className="font-mono" placeholder="#…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Réseaux sociaux & avis</CardTitle>
                <CardDescription>
                  Affichés en footer de la carte publique. Le lien Google Review alimente le jeu roulette.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="siteWeb"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Site web</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="googleReviewUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Lien Google Review</FormLabel>
                      <FormControl>
                        <Input placeholder="https://g.page/r/…" {...field} />
                      </FormControl>
                      <FormDescription>
                        Utilisé par le jeu roulette pour rediriger les clients qui veulent
                        gagner un lot.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="facebookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tiktokUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tiktok.com/@…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3">
          {form.formState.isDirty && (
            <p className="text-xs text-[var(--text-muted)]">Modifications non enregistrées</p>
          )}
          <Button type="submit" disabled={!form.formState.isDirty || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </Form>
  );
}
