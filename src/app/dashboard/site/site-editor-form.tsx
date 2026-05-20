"use client";

import { useState, useTransition } from "react";
import {
  useForm,
  useFieldArray,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RestaurantSiteConfig } from "@/features/restaurant-site/types";
import {
  saveSiteConfig,
  toggleSiteEnabled,
} from "@/server/dashboard/site-actions";

/**
 * Schéma Zod côté client — version souple (pas de message d'erreur affiché
 * par champ pour garder le formulaire dense ; la validation serveur stricte
 * fait foi via toast.error).
 */
const schema = z.object({
  sections: z.object({
    about: z.boolean(),
    menuTeaser: z.boolean(),
    gallery: z.boolean(),
    testimonials: z.boolean(),
    practical: z.boolean(),
    reservation: z.boolean(),
  }),
  hero: z.object({
    variant: z.enum(["split", "banner"]),
    title: z.string().max(255).optional(),
    subtitle: z.string().max(1000).optional(),
    imageUrl: z.string().max(500).optional(),
    ctaLabel: z.string().max(100).optional(),
    ctaUrl: z.string().max(500).optional(),
    eyebrow: z.string().max(120).optional(),
  }),
  about: z.object({
    title: z.string().max(255).optional(),
    text: z.string().max(5000).optional(),
    imageUrl: z.string().max(500).optional(),
  }),
  menuTeaser: z.object({
    title: z.string().max(255).optional(),
    subtitle: z.string().max(500).optional(),
    ctaLabel: z.string().max(100).optional(),
  }),
  gallery: z
    .array(
      z.object({
        url: z.string().min(1).max(500),
        caption: z.string().max(255).optional(),
        alt: z.string().max(255).optional(),
      }),
    )
    .max(30),
  testimonials: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        text: z.string().min(1).max(2000),
        rating: z.number().min(0).max(5).optional(),
        source: z.string().max(50).optional(),
        date: z.string().max(50).optional(),
      }),
    )
    .max(20),
  practical: z.object({
    phone: z.string().max(50).optional(),
    email: z.string().max(255).optional(),
    schedule: z.string().max(1000).optional(),
    mapsUrl: z.string().max(500).optional(),
  }),
  reservation: z.object({
    url: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
    label: z.string().max(100).optional(),
  }),
  seo: z.object({
    title: z.string().max(255).optional(),
    description: z.string().max(500).optional(),
  }),
});

type Values = z.infer<typeof schema>;

interface SiteEditorFormProps {
  restaurantId: string;
  initialConfig: RestaurantSiteConfig;
  initialEnabled: boolean;
}

export function SiteEditorForm({
  restaurantId,
  initialConfig,
  initialEnabled,
}: SiteEditorFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enabledPending, startEnabledTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sections: initialConfig.sections,
      hero: {
        variant: initialConfig.hero.variant,
        title: initialConfig.hero.title ?? "",
        subtitle: initialConfig.hero.subtitle ?? "",
        imageUrl: initialConfig.hero.imageUrl ?? "",
        ctaLabel: initialConfig.hero.ctaLabel ?? "",
        ctaUrl: initialConfig.hero.ctaUrl ?? "",
        eyebrow: initialConfig.hero.eyebrow ?? "",
      },
      about: {
        title: initialConfig.about?.title ?? "",
        text: initialConfig.about?.text ?? "",
        imageUrl: initialConfig.about?.imageUrl ?? "",
      },
      menuTeaser: {
        title: initialConfig.menuTeaser?.title ?? "",
        subtitle: initialConfig.menuTeaser?.subtitle ?? "",
        ctaLabel: initialConfig.menuTeaser?.ctaLabel ?? "",
      },
      gallery: initialConfig.gallery ?? [],
      testimonials: initialConfig.testimonials ?? [],
      practical: {
        phone: initialConfig.practical?.phone ?? "",
        email: initialConfig.practical?.email ?? "",
        schedule: initialConfig.practical?.schedule ?? "",
        mapsUrl: initialConfig.practical?.mapsUrl ?? "",
      },
      reservation: {
        url: initialConfig.reservation?.url ?? "",
        phone: initialConfig.reservation?.phone ?? "",
        label: initialConfig.reservation?.label ?? "",
      },
      seo: {
        title: initialConfig.seo?.title ?? "",
        description: initialConfig.seo?.description ?? "",
      },
    },
  });

  // === Gallery field array ===
  const gallery = useFieldArray({ control: form.control, name: "gallery" });
  // === Testimonials field array ===
  const testimonials = useFieldArray({
    control: form.control,
    name: "testimonials",
  });

  const onSubmit = (values: Values) => {
    startSaveTransition(async () => {
      // Reconstruit le payload typé en cleanup des chaînes vides
      const payload: RestaurantSiteConfig = {
        version: 1,
        sections: values.sections,
        hero: {
          variant: values.hero.variant,
          title: blankToUndef(values.hero.title),
          subtitle: blankToUndef(values.hero.subtitle),
          imageUrl: blankToUndef(values.hero.imageUrl),
          ctaLabel: blankToUndef(values.hero.ctaLabel),
          ctaUrl: blankToUndef(values.hero.ctaUrl),
          eyebrow: blankToUndef(values.hero.eyebrow),
        },
        about: {
          title: blankToUndef(values.about.title),
          text: blankToUndef(values.about.text),
          imageUrl: blankToUndef(values.about.imageUrl),
        },
        menuTeaser: {
          title: blankToUndef(values.menuTeaser.title),
          subtitle: blankToUndef(values.menuTeaser.subtitle),
          ctaLabel: blankToUndef(values.menuTeaser.ctaLabel),
        },
        gallery: values.gallery,
        testimonials: values.testimonials,
        practical: {
          phone: blankToUndef(values.practical.phone),
          email: blankToUndef(values.practical.email),
          schedule: blankToUndef(values.practical.schedule),
          mapsUrl: blankToUndef(values.practical.mapsUrl),
        },
        reservation: {
          url: blankToUndef(values.reservation.url),
          phone: blankToUndef(values.reservation.phone),
          label: blankToUndef(values.reservation.label),
        },
        seo: {
          title: blankToUndef(values.seo.title),
          description: blankToUndef(values.seo.description),
        },
      };

      const res = await saveSiteConfig(payload);
      if (res.ok) {
        toast.success("Site sauvegardé. Cache invalidé.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleToggleEnabled = (next: boolean) => {
    startEnabledTransition(async () => {
      const res = await toggleSiteEnabled(next);
      if (res.ok) {
        setEnabled(next);
        toast.success(
          next
            ? "Site activé. /site/" + restaurantId + " est en ligne."
            : "Site désactivé.",
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* ============ Toggle on/off ============ */}
      <Card className="border-[var(--accent)]/40 bg-[var(--accent)]/5">
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {enabled ? (
                <>
                  <Eye className="mr-1 inline size-3.5" />
                  Site en ligne
                </>
              ) : (
                <>
                  <EyeOff className="mr-1 inline size-3.5" />
                  Site désactivé (404)
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              URL publique :{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5">
                /site/{restaurantId}
              </code>
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={enabledPending}
          />
        </CardContent>
      </Card>

      {/* ============ Sections toggles ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Sections affichées</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <SectionToggle
            label="À propos"
            description="Texte de présentation + image"
            checked={form.watch("sections.about")}
            onChange={(v) => form.setValue("sections.about", v, { shouldDirty: true })}
          />
          <SectionToggle
            label="Mise en avant carte"
            description="Bloc avec lien vers /carte"
            checked={form.watch("sections.menuTeaser")}
            onChange={(v) =>
              form.setValue("sections.menuTeaser", v, { shouldDirty: true })
            }
          />
          <SectionToggle
            label="Galerie photos"
            description="Grille de photos R2"
            checked={form.watch("sections.gallery")}
            onChange={(v) =>
              form.setValue("sections.gallery", v, { shouldDirty: true })
            }
          />
          <SectionToggle
            label="Témoignages clients"
            description="Avis avec note + auteur"
            checked={form.watch("sections.testimonials")}
            onChange={(v) =>
              form.setValue("sections.testimonials", v, { shouldDirty: true })
            }
          />
          <SectionToggle
            label="Infos pratiques"
            description="Adresse, horaires, contact"
            checked={form.watch("sections.practical")}
            onChange={(v) =>
              form.setValue("sections.practical", v, { shouldDirty: true })
            }
          />
          <SectionToggle
            label="Bande réservation"
            description="CTA réserver (URL ou tel)"
            checked={form.watch("sections.reservation")}
            onChange={(v) =>
              form.setValue("sections.reservation", v, { shouldDirty: true })
            }
          />
        </CardContent>
      </Card>

      {/* ============ Hero ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Hero (entête)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Style">
              <Select
                value={form.watch("hero.variant")}
                onValueChange={(v) =>
                  form.setValue("hero.variant", v as "split" | "banner", {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Split (image + texte)</SelectItem>
                  <SelectItem value="banner">Banner (image plein écran)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Eyebrow (petit label)">
              <Input
                {...form.register("hero.eyebrow")}
                placeholder="Cuisine traditionnelle française"
              />
            </Field>
          </div>
          <Field label="Titre (h1)">
            <Input
              {...form.register("hero.title")}
              placeholder="Nom du restaurant (vide = nom resto)"
            />
          </Field>
          <Field label="Sous-titre">
            <Textarea
              rows={2}
              {...form.register("hero.subtitle")}
              placeholder="Une cuisine de caractère, des produits locaux..."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Image hero (URL)">
              <Input
                {...form.register("hero.imageUrl")}
                placeholder="https://… (vide = bannière du resto)"
              />
            </Field>
            <Field label="Label du CTA principal">
              <Input
                {...form.register("hero.ctaLabel")}
                placeholder="Voir la carte"
              />
            </Field>
          </div>
          <Field label="URL du CTA principal (interne ou externe)">
            <Input
              {...form.register("hero.ctaUrl")}
              placeholder={`/carte/${restaurantId} (vide = par défaut)`}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ============ About ============ */}
      <Card>
        <CardHeader>
          <CardTitle>À propos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titre">
              <Input {...form.register("about.title")} placeholder="Notre maison" />
            </Field>
            <Field label="Image (URL R2)">
              <Input
                {...form.register("about.imageUrl")}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field label="Texte (peut faire plusieurs paragraphes)">
            <Textarea
              rows={6}
              {...form.register("about.text")}
              placeholder="Notre histoire, notre concept, notre équipe..."
            />
          </Field>
        </CardContent>
      </Card>

      {/* ============ Menu teaser ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Mise en avant carte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titre">
              <Input
                {...form.register("menuTeaser.title")}
                placeholder="La carte"
              />
            </Field>
            <Field label="Label CTA">
              <Input
                {...form.register("menuTeaser.ctaLabel")}
                placeholder="Voir la carte complète"
              />
            </Field>
          </div>
          <Field label="Phrase d'accroche">
            <Input
              {...form.register("menuTeaser.subtitle")}
              placeholder="Découvrez nos plats, mis à jour régulièrement"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ============ Gallery ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Galerie photos ({gallery.fields.length}/30)</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gallery.append({ url: "", caption: "", alt: "" })}
              disabled={gallery.fields.length >= 30}
            >
              <Plus className="size-3.5" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gallery.fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              <ImageIcon className="mx-auto mb-2 size-5" strokeWidth={1.5} />
              Aucune photo. Clic « Ajouter » pour coller une URL R2.
            </p>
          ) : (
            gallery.fields.map((field, i) => (
              <GalleryRow
                key={field.id}
                register={form.register}
                index={i}
                onRemove={() => gallery.remove(i)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ============ Testimonials ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Témoignages ({testimonials.fields.length}/20)</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                testimonials.append({
                  name: "",
                  text: "",
                  rating: 5,
                  source: "",
                  date: "",
                })
              }
              disabled={testimonials.fields.length >= 20}
            >
              <Plus className="size-3.5" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {testimonials.fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              Aucun témoignage. Copie-colle des avis Google ou TripAdvisor.
            </p>
          ) : (
            testimonials.fields.map((field, i) => (
              <TestimonialRow
                key={field.id}
                register={form.register}
                index={i}
                onRemove={() => testimonials.remove(i)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ============ Practical ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Infos pratiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Téléphone">
              <Input
                {...form.register("practical.phone")}
                placeholder="01 23 45 67 89"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                {...form.register("practical.email")}
                placeholder="contact@restaurant.fr"
              />
            </Field>
          </div>
          <Field label="Horaires (multi-lignes acceptées)">
            <Textarea
              rows={4}
              {...form.register("practical.schedule")}
              placeholder="Mardi - Samedi&#10;12h00 - 14h30 · 19h00 - 22h30&#10;Fermé dimanche et lundi"
            />
          </Field>
          <Field label="URL Google Maps (vide = adresse du resto)">
            <Input
              {...form.register("practical.mapsUrl")}
              placeholder="https://goo.gl/maps/…"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ============ Reservation ============ */}
      <Card>
        <CardHeader>
          <CardTitle>Réservation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="URL externe (TheFork, Zenchef, OpenTable…)">
            <Input
              {...form.register("reservation.url")}
              placeholder="https://www.thefork.fr/…"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Téléphone de réservation (fallback si pas d'URL)">
              <Input
                {...form.register("reservation.phone")}
                placeholder="01 23 45 67 89"
              />
            </Field>
            <Field label="Label du bouton">
              <Input
                {...form.register("reservation.label")}
                placeholder="Réserver une table"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ============ SEO ============ */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Titre (balise <title>)">
            <Input
              {...form.register("seo.title")}
              placeholder="Vide = nom du resto — Restaurant à Ville"
              maxLength={60}
            />
          </Field>
          <Field label="Meta description">
            <Textarea
              rows={2}
              {...form.register("seo.description")}
              placeholder="Vide = description du resto"
              maxLength={160}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ============ Sticky save bar ============ */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-3 backdrop-blur-xl">
        <p className="text-xs text-[var(--text-muted)]">
          Modifications appliquées dès sauvegarde. Le cache CDN se purge
          automatiquement (~60s).
        </p>
        <Button type="submit" disabled={savePending}>
          {savePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Sauvegarder
        </Button>
      </div>
    </form>
  );
}

// ============== Helpers UI ==============

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[var(--text-secondary)]">{label}</Label>
      {children}
    </div>
  );
}

function SectionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function GalleryRow({
  register,
  index,
  onRemove,
}: {
  register: UseFormRegister<Values>;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3 sm:grid-cols-[2fr_2fr_2fr_auto]">
      <Input
        placeholder="URL image (R2)"
        {...register(`gallery.${index}.url` as const)}
      />
      <Input
        placeholder="Légende (optionnel)"
        {...register(`gallery.${index}.caption` as const)}
      />
      <Input
        placeholder="Alt accessibilité"
        {...register(`gallery.${index}.alt` as const)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Supprimer cette photo"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function TestimonialRow({
  register,
  index,
  onRemove,
}: {
  register: UseFormRegister<Values>;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Nom (ex: Marie L.)"
          {...register(`testimonials.${index}.name` as const)}
        />
        <Input
          placeholder="Source (ex: Google)"
          {...register(`testimonials.${index}.source` as const)}
        />
        <Input
          placeholder="Date (ex: Mai 2026)"
          {...register(`testimonials.${index}.date` as const)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Note (0-5)"
          min={0}
          max={5}
          step={1}
          className="w-32"
          {...register(`testimonials.${index}.rating` as const, {
            valueAsNumber: true,
          })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Supprimer ce témoignage"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Textarea
        rows={2}
        placeholder="Texte du témoignage"
        {...register(`testimonials.${index}.text` as const)}
      />
    </div>
  );
}

function blankToUndef(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const trim = s.trim();
  return trim.length === 0 ? undefined : trim;
}
