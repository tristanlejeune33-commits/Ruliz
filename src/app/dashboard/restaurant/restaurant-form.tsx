"use client";

import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Sun, Moon, MapPin, Type } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/shared/image-uploader";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import { groupTimezonesByRegion } from "@/lib/timezones";
import {
  DAY_CODES,
  DAY_LABELS_FULL,
  emptyHorairesService,
  presetBistrot,
  presetSeptJoursSur7,
  presetSoirUniquement,
  type DayCode,
  type HorairesService,
} from "@/lib/horaires-service";
import { useAutoSave } from "@/lib/use-auto-save";
import { updateRestaurant } from "@/server/dashboard/actions";

/** Schéma Zod pour une ligne jour de service. */
const serviceRangeSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM").or(z.literal("")),
    end: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM").or(z.literal("")),
  })
  .nullable();

const dayServiceSchema = z.object({
  day: z.enum(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]),
  closed: z.boolean(),
  midi: serviceRangeSchema,
  soir: serviceRangeSchema,
  // Service continu : plage unique (dans `midi`), pas de coupure midi/soir.
  continu: z.boolean().optional(),
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const optHex = z.union([z.string().regex(HEX_COLOR, "Format #RRGGBB"), z.literal("")]);

const schema = z.object({
  nom: z.string().min(1, "Requis").max(255),
  description: z.string().max(2000),
  email: z.string().max(255),
  telephone: z.string().max(20),
  adresse: z.string().max(500),
  codePostal: z.string().max(10),
  ville: z.string().max(100),
  pays: z.string().max(100),
  /**
   * Horaires de service structurés — 7 jours × {closed, midi, soir}.
   * Remplace l'ancien `horairesOuverture` (texte libre) qui demandait
   * un parsing fragile. Affiché tel quel sur la carte + le site v2.
   */
  horairesService: z.array(dayServiceSchema).length(7),
  deviseDefault: z.string().max(5),
  langueNative: z.enum(["fr", "en", "es", "de", "it", "pt", "zh"]),
  /** Fuseau horaire IANA (ex: "Europe/Paris", "Pacific/Auckland"). */
  timezone: z.string().max(64),
  // Horaires de service (presets pour les créneaux de catégories)
  lunchStart: z.string().max(5),
  lunchEnd: z.string().max(5),
  dinnerStart: z.string().max(5),
  dinnerEnd: z.string().max(5),
  happyHourStart: z.string().max(5),
  happyHourEnd: z.string().max(5),
  theme: z.enum(["light", "dark"]),
  fontStyle: z.enum(["modern", "editorial", "elegant"]),
  showMap: z.boolean(),
  showName: z.boolean(),
  couleurPrimaire: optHex,
  couleurSecondaire: optHex,
  couleurFond: optHex,
  couleurTexteTitre: optHex,
  couleurCategorie: optHex,
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

  // Auto-save : à chaque modification, sauvegarde silencieusement après 1.5s
  // sans affichage de toast pour ne pas spam.
  const { status: autoSaveStatus, errorMessage: autoSaveError } = useAutoSave({
    form,
    onSave: async (values) =>
      updateRestaurant({ id: restaurant.id, ...values }),
    delayMs: 1500,
  });

  const logoUrl = form.watch("logoUrl");
  const banniereUrl = form.watch("banniereUrl");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="infos">
          <TabsList data-onboarding-anchor="restaurant-branding">
            <TabsTrigger value="infos" data-onboarding-anchor="restaurant-infos">
              Infos
            </TabsTrigger>
            <TabsTrigger value="theme">Thème</TabsTrigger>
            <TabsTrigger value="couleurs">Couleurs</TabsTrigger>
            <TabsTrigger value="branding">Médias</TabsTrigger>
            <TabsTrigger value="social" data-onboarding-anchor="restaurant-social">
              Réseaux
            </TabsTrigger>
          </TabsList>

          {/* ===================== INFOS ===================== */}
          <TabsContent value="infos">
            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
                <CardDescription>
                  Le nom et la description s&apos;affichent en hero de ta carte publique.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nom du restaurant *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showName"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4 md:col-span-2">
                      <div className="flex items-start gap-3">
                        <Type className="mt-0.5 size-5 shrink-0 text-[var(--text-muted)]" />
                        <div className="space-y-1">
                          <FormLabel className="cursor-pointer">
                            Afficher le nom sur la carte digitale
                          </FormLabel>
                          <p className="text-xs text-[var(--text-muted)]">
                            Le nom s&apos;affiche en grand sous le logo. Désactive
                            si ton logo contient déjà le nom. Activé par défaut.
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Bistronomie sud-ouest dans une cave voûtée du XVIIIe."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Une phrase courte sous le titre. Italique automatique.
                      </FormDescription>
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
                  name="horairesService"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Horaires de service</FormLabel>
                      <FormControl>
                        <HorairesServicePicker
                          value={field.value as HorairesService}
                          onChange={(next) =>
                            field.onChange(next as HorairesService)
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Pour chaque jour, active les services et saisis tes
                        heures. Affiché sur ton mini-site vitrine et utilisé
                        pour générer les créneaux Schema.org SEO.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deviseDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise par défaut</FormLabel>
                      <FormControl>
                        <Input placeholder="€" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Affichée si un produit n&apos;a pas la sienne.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="langueNative"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Langue de saisie de la carte</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORTED_LANGS.map((l) => (
                            <SelectItem key={l} value={l}>
                              <span className="flex items-center gap-2">
                                <FlagIcon lang={l} width={18} rounded />
                                {LANG_META[l].name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[10px]">
                        La langue dans laquelle tu écris ta carte. Anthropic
                        traduit automatiquement vers les autres langues.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Sélecteur fuseau horaire — utilisé pour les créneaux midi/soir/HH */}
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuseau horaire du restaurant</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(groupTimezonesByRegion()).map(
                            ([region, tzs]) => (
                              <div key={region}>
                                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                                  {region}
                                </div>
                                {tzs.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </div>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[10px]">
                        Détermine quand tes créneaux (carte midi, happy hour,
                        carte soir, personnalisé) sont actifs. Important si tu
                        as des clients hors fuseau France métropolitaine.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* HORAIRES DE SERVICE utilisés pour les créneaux carte midi/soir/HH */}
            <Card>
              <CardHeader>
                <CardTitle>Horaires de service</CardTitle>
                <CardDescription>
                  Définit les horaires utilisés pour les créneaux d&apos;affichage
                  des catégories (carte midi, carte soir, happy hour). Tu peux
                  ensuite cocher l&apos;un de ces créneaux dans l&apos;éditeur
                  de menu pour qu&apos;une catégorie n&apos;apparaisse que
                  pendant ces horaires.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">☀️ Service du midi</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="lunchStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Début</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lunchEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">🌙 Service du soir</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="dinnerStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Début</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dinnerEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">🍹 Happy Hour</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="happyHourStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Début</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="happyHourEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== THÈME ===================== */}
          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mode clair / sombre</CardTitle>
                <CardDescription>
                  Le mode sombre donne une carte chic style restaurant haut de gamme.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-3">
                        <ThemeOption
                          value="light"
                          current={field.value}
                          onSelect={field.onChange}
                          icon={Sun}
                          label="Clair"
                          description="Lumineux, food-friendly"
                        />
                        <ThemeOption
                          value="dark"
                          current={field.value}
                          onSelect={field.onChange}
                          icon={Moon}
                          label="Sombre"
                          description="Élégant, gastronomique"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Style de typographie</CardTitle>
                <CardDescription>
                  Influence le caractère visuel des titres sur la carte publique.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="fontStyle"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid gap-3 md:grid-cols-3">
                        <FontOption
                          value="modern"
                          current={field.value}
                          onSelect={field.onChange}
                          name="Modern"
                          description="Brasserie, café, vegan, healthy"
                          fontFamily="ui-sans-serif, system-ui, sans-serif"
                          sample="Le Tire-Bouchon"
                        />
                        <FontOption
                          value="editorial"
                          current={field.value}
                          onSelect={field.onChange}
                          name="Editorial"
                          description="Bistronomie, bar à vins, signature"
                          fontFamily="'Fraunces', ui-serif, Georgia, serif"
                          sample="Le Tire-Bouchon"
                        />
                        <FontOption
                          value="elegant"
                          current={field.value}
                          onSelect={field.onChange}
                          name="Elegant"
                          description="Fine dining, sushi, hôtel"
                          fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                          sample="Le Tire-Bouchon"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan d&apos;accès</CardTitle>
                <CardDescription>
                  Affiche une carte Google Maps cliquable dans le pied de page
                  de ta carte digitale, avec un bouton « itinéraire ».
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="showMap"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--text-muted)]" />
                        <div className="space-y-1">
                          <FormLabel className="cursor-pointer">
                            Afficher la carte Maps
                          </FormLabel>
                          <p className="text-xs text-[var(--text-muted)]">
                            Nécessite une adresse renseignée dans l&apos;onglet
                            Infos. Désactivé par défaut.
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== COULEURS ===================== */}
          <TabsContent value="couleurs">
            <Card>
              <CardHeader>
                <CardTitle>Couleurs de la carte publique</CardTitle>
                <CardDescription>
                  Format hexadécimal <code>#RRGGBB</code>. Laisse vide pour utiliser les
                  couleurs par défaut élégantes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <ColorField
                  control={form.control}
                  name="couleurPrimaire"
                  label="Accent / CTA"
                  helper="Boutons, badges, surlignages"
                  defaultPreview="#4870e0"
                />
                <ColorField
                  control={form.control}
                  name="couleurFond"
                  label="Fond de la carte"
                  helper="Couleur générale derrière le contenu"
                  defaultPreview={
                    form.watch("theme") === "dark" ? "#1a1a1a" : "#fdfcf8"
                  }
                />
                <ColorField
                  control={form.control}
                  name="couleurTexteTitre"
                  label="Titre du restaurant"
                  helper="Le grand titre en haut de la carte"
                  defaultPreview={
                    form.watch("theme") === "dark" ? "#f5f5f5" : "#1a1a1a"
                  }
                />
                <ColorField
                  control={form.control}
                  name="couleurCategorie"
                  label="Titres de catégories"
                  helper="« Entrées », « Plats », etc."
                  defaultPreview={
                    form.watch("theme") === "dark" ? "#e0e0e0" : "#3a3a3a"
                  }
                />
                <ColorField
                  control={form.control}
                  name="couleurSecondaire"
                  label="Secondaire (réservé)"
                  helper="Pour future utilisation"
                  defaultPreview=""
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== MÉDIAS (logo + bannière) ===================== */}
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo et bannière</CardTitle>
                <CardDescription>
                  Logo carré (idéal 150×150px). Bannière en hero, ratio 16/9.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Logo{" "}
                    <span className="text-[var(--text-muted)]">(150×150px)</span>
                  </p>
                  <ImageUploader
                    value={logoUrl}
                    onChange={(url) =>
                      form.setValue("logoUrl", url ?? "", { shouldDirty: true })
                    }
                    restaurantId={restaurant.id}
                    kind="logo"
                    aspect="1/1"
                    label="Choisir un logo"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Bannière{" "}
                    <span className="text-[var(--text-muted)]">(ratio 16/9)</span>
                  </p>
                  <ImageUploader
                    value={banniereUrl}
                    onChange={(url) =>
                      form.setValue("banniereUrl", url ?? "", { shouldDirty: true })
                    }
                    restaurantId={restaurant.id}
                    kind="banniere"
                    aspect="16/9"
                    label="Choisir une bannière"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== RÉSEAUX ===================== */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Réseaux sociaux & avis</CardTitle>
                <CardDescription>
                  Affichés en footer de la carte publique. Le lien Google Review alimente
                  le jeu roulette.
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

        {/* Auto-save 100% silencieux la sauvegarde se déclenche 1.5s
            après chaque modification. La bar visuelle a été retirée car
            elle était quasi-vide (juste un statut idle invisible). En cas
            d'erreur, l'AutoSaveErrorToast affiche un toast Sonner rouge. */}
        <AutoSaveErrorToast
          status={autoSaveStatus}
          errorMessage={autoSaveError}
        />

        {/* Bouton "Sauvegarder maintenant" sticky bas — fallback si l'auto-save
            ne trigger pas pour une raison X (browser, focus loss, etc.).
            Click → submit synchrone garanti + toast de feedback. */}
        <div className="sticky bottom-0 z-10 -mx-6 mt-6 flex items-center justify-between gap-3 border-t border-[var(--border-glass)] bg-[var(--bg-primary)]/95 px-6 py-3 backdrop-blur">
          <div className="text-xs text-[var(--text-muted)]">
            {autoSaveStatus === "saving" && "Sauvegarde en cours…"}
            {autoSaveStatus === "saved" && "✓ Sauvegardé"}
            {autoSaveStatus === "pending" && "Modification en attente…"}
            {autoSaveStatus === "error" &&
              "✗ Erreur — clique le bouton pour réessayer"}
            {autoSaveStatus === "idle" && "Auto-save activé"}
          </div>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sauvegarde…
              </>
            ) : (
              <>
                <Save className="size-4" strokeWidth={2} />
                Sauvegarder maintenant
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ============================================================================
// Composants utilitaires
// ============================================================================

function ThemeOption({
  value,
  current,
  onSelect,
  icon: Icon,
  label,
  description,
}: {
  value: "light" | "dark";
  current: string;
  onSelect: (v: string) => void;
  icon: typeof Sun;
  label: string;
  description: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
          : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]",
      )}
    >
      <Icon
        className={cn(
          "size-5",
          active ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
        )}
      />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </button>
  );
}

function FontOption({
  value,
  current,
  onSelect,
  name,
  description,
  fontFamily,
  sample,
}: {
  value: "modern" | "editorial" | "elegant";
  current: string;
  onSelect: (v: string) => void;
  name: string;
  description: string;
  fontFamily: string;
  sample: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
          : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{name}</p>
        {active && (
          <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
            Actif
          </span>
        )}
      </div>
      <p
        className="truncate text-2xl font-medium leading-tight tracking-tight"
        style={{ fontFamily }}
      >
        {sample}
      </p>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
    </button>
  );
}

import type { Control } from "react-hook-form";

function ColorField({
  control,
  name,
  label,
  helper,
  defaultPreview,
}: {
  control: Control<Values>;
  name:
    | "couleurPrimaire"
    | "couleurSecondaire"
    | "couleurFond"
    | "couleurTexteTitre"
    | "couleurCategorie";
  label: string;
  helper: string;
  defaultPreview: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value || "";
        const swatchColor = value.match(HEX_COLOR) ? value : null;
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-3">
              <div
                className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)]"
                style={{
                  backgroundColor: swatchColor ?? "transparent",
                  backgroundImage: swatchColor
                    ? "none"
                    : "linear-gradient(45deg, var(--bg-elevated) 25%, transparent 25%), linear-gradient(-45deg, var(--bg-elevated) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--bg-elevated) 75%), linear-gradient(-45deg, transparent 75%, var(--bg-elevated) 75%)",
                  backgroundSize: "8px 8px",
                  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
                }}
              >
                <input
                  type="color"
                  value={swatchColor ?? "#4870e0"}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={`${label} (color picker)`}
                />
              </div>
              <FormControl>
                <Input
                  className="font-mono"
                  placeholder={defaultPreview}
                  {...field}
                />
              </FormControl>
            </div>
            <FormDescription className="text-[10px]">{helper}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Toast silencieux qui apparaît uniquement quand l'auto-save échoue.
 * Évite d'afficher en permanence une barre visuelle "auto-save status"
 * qui prenait de la place pour rien quand tout va bien (cas le plus
 * fréquent).
 */
function AutoSaveErrorToast({
  status,
  errorMessage,
}: {
  status: import("@/lib/use-auto-save").AutoSaveStatus;
  errorMessage: string;
}) {
  const lastShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (status === "error" && errorMessage && lastShownRef.current !== errorMessage) {
      toast.error(`Auto-save échouée : ${errorMessage}`);
      lastShownRef.current = errorMessage;
    }
    if (status === "saved") {
      // Reset pour permettre au prochain message d'erreur de s'afficher
      lastShownRef.current = null;
    }
  }, [status, errorMessage]);
  return null;
}

// ====================================================================
// === HORAIRES DE SERVICE — picker jour-par-jour ===
// ====================================================================

/**
 * Grille 7 jours × {service midi, service soir}. Pour chaque jour :
 *   - Switch "Ouvert / Fermé"
 *   - Si ouvert : 2 toggles (midi/soir) qui font apparaître 2 time pickers
 *   - Si fermé : on cache tout
 *
 * Presets en haut : Bistrot mar-sam / 7j sur 7 / Soir uniquement, qui
 * remplacent intégralement le state en 1 clic.
 *
 * "Copier sur la semaine" sur chaque ligne copie ce jour-là sur les 6 autres.
 */
function HorairesServicePicker({
  value,
  onChange,
}: {
  value: HorairesService;
  onChange: (next: HorairesService) => void;
}) {
  // Si pas de value initiale (legacy resto sans données), on init fermé
  const data: HorairesService =
    value && Array.isArray(value) && value.length === 7
      ? value
      : emptyHorairesService();

  function updateDay(
    dayIndex: number,
    patch: Partial<HorairesService[number]>,
  ) {
    const next = [...data] as HorairesService;
    next[dayIndex] = { ...next[dayIndex]!, ...patch };
    onChange(next);
  }

  function copyToWeek(sourceIndex: number) {
    const source = data[sourceIndex]!;
    const next = data.map((d, i) =>
      i === sourceIndex
        ? d
        : { ...source, day: d.day },
    ) as HorairesService;
    onChange(next);
    toast.success(`${DAY_LABELS_FULL[source.day]} copié sur tous les jours`);
  }

  return (
    <div className="space-y-3">
      {/* Presets row */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
        <span className="text-xs text-[var(--text-muted)]">Presets :</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(presetBistrot())}
        >
          Bistrot mar-sam
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(presetSeptJoursSur7())}
        >
          7j/7
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(presetSoirUniquement())}
        >
          Soir uniquement
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyHorairesService())}
          className="text-[var(--text-muted)]"
        >
          Tout effacer
        </Button>
      </div>

      {/* Day rows */}
      {(DAY_CODES as readonly DayCode[]).map((day, i) => {
        const d = data[i]!;
        const dayLabel = DAY_LABELS_FULL[day];
        return (
          <div
            key={day}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3"
          >
            {/* Header row : jour + toggle ouvert/fermé + copier */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium">{dayLabel}</span>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!d.closed}
                    onChange={(e) =>
                      updateDay(i, {
                        closed: !e.target.checked,
                        midi: !e.target.checked ? null : d.midi,
                        soir: !e.target.checked ? null : d.soir,
                      })
                    }
                    className="size-4 cursor-pointer accent-[var(--accent)]"
                  />
                  <span>{d.closed ? "Fermé" : "Ouvert"}</span>
                </label>
              </div>
              {!d.closed && (
                <button
                  type="button"
                  onClick={() => copyToWeek(i)}
                  className="text-[10px] text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
                >
                  Copier sur la semaine
                </button>
              )}
            </div>

            {!d.closed && (
              <div className="mt-3 space-y-3">
                {/* Sélecteur de mode : deux services vs service continu */}
                <div className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      updateDay(i, {
                        continu: false,
                        // Réhydrate les deux services depuis la plage continue
                        midi: d.midi ?? { start: "12:00", end: "14:30" },
                        soir: d.soir ?? { start: "19:00", end: "22:30" },
                      })
                    }
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      !d.continu
                        ? "bg-[var(--accent)] text-[var(--accent-foreground,#0b0b0b)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Midi + Soir
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDay(i, {
                        continu: true,
                        // Plage unique stockée dans midi, soir effacé
                        midi: d.midi ?? { start: "11:30", end: "23:00" },
                        soir: null,
                      })
                    }
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      d.continu
                        ? "bg-[var(--accent)] text-[var(--accent-foreground,#0b0b0b)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Service continu
                  </button>
                </div>

                {d.continu ? (
                  /* Une seule plage, sans coupure (ex: 11h30→23h) */
                  <ServiceSlot
                    label="Service continu"
                    range={d.midi}
                    onChange={(midi) => updateDay(i, { midi, soir: null })}
                    defaultStart="11:30"
                    defaultEnd="23:00"
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Midi */}
                    <ServiceSlot
                      label="Déjeuner"
                      range={d.midi}
                      onChange={(midi) => updateDay(i, { midi })}
                      defaultStart="12:00"
                      defaultEnd="14:30"
                    />
                    {/* Soir */}
                    <ServiceSlot
                      label="Dîner"
                      range={d.soir}
                      onChange={(soir) => updateDay(i, { soir })}
                      defaultStart="19:00"
                      defaultEnd="22:30"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Slot de service unitaire — toggle + 2 time pickers. */
function ServiceSlot({
  label,
  range,
  onChange,
  defaultStart,
  defaultEnd,
}: {
  label: string;
  range: { start: string; end: string } | null;
  onChange: (next: { start: string; end: string } | null) => void;
  defaultStart: string;
  defaultEnd: string;
}) {
  const active = range !== null;
  return (
    <div className="space-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 p-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { start: defaultStart, end: defaultEnd }
                : null,
            )
          }
          className="size-3.5 cursor-pointer accent-[var(--accent)]"
        />
        <span className="font-medium">{label}</span>
      </label>
      {active && range && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <input
            type="time"
            value={range.start}
            onChange={(e) => onChange({ ...range, start: e.target.value })}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1.5 text-xs font-mono"
          />
          <span className="text-[var(--text-muted)]">→</span>
          <input
            type="time"
            value={range.end}
            onChange={(e) => onChange({ ...range, end: e.target.value })}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1.5 text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
}
