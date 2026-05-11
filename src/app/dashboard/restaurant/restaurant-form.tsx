"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Sun, Moon, Upload } from "lucide-react";
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
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import { useAutoSave } from "@/lib/use-auto-save";
import { updateRestaurant } from "@/server/dashboard/actions";

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
  deviseDefault: z.string().max(5),
  langueNative: z.enum(["fr", "en", "es", "de", "it", "pt", "zh"]),
  // Horaires de service (presets pour les créneaux de catégories)
  lunchStart: z.string().max(5),
  lunchEnd: z.string().max(5),
  dinnerStart: z.string().max(5),
  dinnerEnd: z.string().max(5),
  happyHourStart: z.string().max(5),
  happyHourEnd: z.string().max(5),
  theme: z.enum(["light", "dark"]),
  fontStyle: z.enum(["modern", "editorial", "elegant"]),
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
          <TabsList>
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="theme">Thème</TabsTrigger>
            <TabsTrigger value="couleurs">Couleurs</TabsTrigger>
            <TabsTrigger value="branding">Médias</TabsTrigger>
            <TabsTrigger value="social">Réseaux</TabsTrigger>
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
              </CardContent>
            </Card>

            {/* HORAIRES DE SERVICE — utilisés pour les créneaux carte midi/soir/HH */}
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
                  defaultPreview="—"
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

        {/* Indicateur auto-save discret en bas — pas de bouton "Enregistrer
            maintenant" car la sauvegarde se déclenche automatiquement 1.5s
            après chaque modification. L'indicateur montre l'état : idle /
            saving / saved / error. */}
        <div
          className="sticky z-10 flex justify-end rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/85 p-3 backdrop-blur-md lg:bottom-4"
          style={{
            bottom: "calc(64px + env(safe-area-inset-bottom) + 12px)",
          }}
        >
          <AutoSaveIndicator
            status={autoSaveStatus}
            errorMessage={autoSaveError}
          />
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
