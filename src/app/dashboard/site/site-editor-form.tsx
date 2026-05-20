"use client";

import { useRef, useState, useTransition } from "react";
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
  RefreshCw,
  Save,
  Sparkles,
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
import { ImageUploader } from "@/components/shared/image-uploader";
import { slugify } from "@/lib/slugify";
import type { RestaurantSiteConfig } from "@/features/restaurant-site/types";
import { SITE_TEMPLATES } from "@/features/restaurant-site/types";
import {
  applySiteTemplate,
  saveSiteConfig,
  toggleSiteEnabled,
} from "@/server/dashboard/site-actions";

const schema = z.object({
  slug: z.string().max(64).optional(),
  sections: z.object({
    about: z.boolean(),
    menuTeaser: z.boolean(),
    gallery: z.boolean(),
    testimonials: z.boolean(),
    practical: z.boolean(),
    reservation: z.boolean(),
    team: z.boolean(),
    faq: z.boolean(),
  }),
  hero: z.object({
    variant: z.enum(["split", "banner", "centered", "video"]),
    title: z.string().max(255).optional(),
    subtitle: z.string().max(1000).optional(),
    imageUrl: z.string().max(500).optional(),
    videoUrl: z.string().max(500).optional(),
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
  team: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        role: z.string().min(1).max(100),
        bio: z.string().max(500).optional(),
        imageUrl: z.string().max(500).optional(),
      }),
    )
    .max(12),
  faq: z
    .array(
      z.object({
        question: z.string().min(1).max(255),
        answer: z.string().min(1).max(2000),
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
  style: z.object({
    fontHeading: z.enum(["serif", "sans", "display"]).optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Format #RRGGBB requis")
      .optional()
      .or(z.literal("")),
  }),
});

type Values = z.infer<typeof schema>;

interface SiteEditorFormProps {
  restaurantId: string;
  initialConfig: RestaurantSiteConfig;
  initialEnabled: boolean;
  initialSlug: string | null;
  plan: "freemium" | "pro" | "premium";
}

export function SiteEditorForm({
  restaurantId,
  initialConfig,
  initialEnabled,
  initialSlug,
  plan,
}: SiteEditorFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [enabledPending, startEnabledTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [templatePending, startTemplateTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPaid = plan === "pro" || plan === "premium";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: initialSlug ?? "",
      sections: initialConfig.sections,
      hero: {
        variant: initialConfig.hero.variant,
        title: initialConfig.hero.title ?? "",
        subtitle: initialConfig.hero.subtitle ?? "",
        imageUrl: initialConfig.hero.imageUrl ?? "",
        videoUrl: initialConfig.hero.videoUrl ?? "",
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
      team: initialConfig.team ?? [],
      faq: initialConfig.faq ?? [],
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
      style: {
        fontHeading: initialConfig.style?.fontHeading,
        accentColor: initialConfig.style?.accentColor ?? "",
      },
    },
  });

  const gallery = useFieldArray({ control: form.control, name: "gallery" });
  const testimonials = useFieldArray({
    control: form.control,
    name: "testimonials",
  });
  const team = useFieldArray({ control: form.control, name: "team" });
  const faq = useFieldArray({ control: form.control, name: "faq" });

  // Bumper le key de l'iframe force un reload propre (vs juste .reload())
  const refreshPreview = () => setPreviewKey((k) => k + 1);

  const onSubmit = (values: Values) => {
    startSaveTransition(async () => {
      const payload: RestaurantSiteConfig = {
        version: 1,
        sections: values.sections,
        hero: cleanObj({
          variant: values.hero.variant,
          title: blank(values.hero.title),
          subtitle: blank(values.hero.subtitle),
          imageUrl: blank(values.hero.imageUrl),
          videoUrl: blank(values.hero.videoUrl),
          ctaLabel: blank(values.hero.ctaLabel),
          ctaUrl: blank(values.hero.ctaUrl),
          eyebrow: blank(values.hero.eyebrow),
        }) as RestaurantSiteConfig["hero"],
        about: cleanObj({
          title: blank(values.about.title),
          text: blank(values.about.text),
          imageUrl: blank(values.about.imageUrl),
        }),
        menuTeaser: cleanObj({
          title: blank(values.menuTeaser.title),
          subtitle: blank(values.menuTeaser.subtitle),
          ctaLabel: blank(values.menuTeaser.ctaLabel),
        }),
        gallery: values.gallery,
        testimonials: values.testimonials,
        team: values.team,
        faq: values.faq,
        practical: cleanObj({
          phone: blank(values.practical.phone),
          email: blank(values.practical.email),
          schedule: blank(values.practical.schedule),
          mapsUrl: blank(values.practical.mapsUrl),
        }),
        reservation: cleanObj({
          url: blank(values.reservation.url),
          phone: blank(values.reservation.phone),
          label: blank(values.reservation.label),
        }),
        seo: cleanObj({
          title: blank(values.seo.title),
          description: blank(values.seo.description),
        }),
        style: cleanObj({
          fontHeading: values.style.fontHeading,
          accentColor: blank(values.style.accentColor),
        }),
        slug: values.slug?.trim() || undefined,
      };

      const res = await saveSiteConfig(payload);
      if (res.ok) {
        toast.success("Site sauvegardé. Preview rafraîchie.");
        if ("slug" in res && res.slug !== undefined) setSlug(res.slug);
        refreshPreview();
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
          next ? "Site activé. Il est en ligne." : "Site désactivé.",
        );
        refreshPreview();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (
      !confirm(
        "Appliquer ce template va remplacer ton contenu actuel. Continuer ?",
      )
    )
      return;
    startTemplateTransition(async () => {
      const res = await applySiteTemplate(
        templateId as "bistrot" | "moderne" | "pizzeria" | "gastronomique" | "brasserie",
      );
      if (res.ok) {
        toast.success("Template appliqué. Recharge la page pour voir.");
        // Recharge pour pull la nouvelle config en defaultValues
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  };

  // Auto-fill du slug à partir du titre du resto si vide
  const handleAutoSlug = () => {
    const heroTitle = form.getValues("hero.title");
    const base = slugify(heroTitle || "mon-restaurant");
    form.setValue("slug", base, { shouldDirty: true });
  };

  // URL de la preview (slug si dispo, sinon ID)
  const previewUrl = `/site/${slug ?? restaurantId}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
      {/* ============ FORM (left column) ============ */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 lg:max-w-2xl"
      >
        {!isPaid && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="pt-6 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Plan Pro ou Premium requis
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Le site vitrine est inclus avec Pro (29,90&nbsp;€) et Premium
                (44,90&nbsp;€). Tu peux éditer le contenu, mais la sauvegarde
                est désactivée tant que tu n&apos;upgrades pas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Toggle on/off */}
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
                  {previewUrl}
                </code>
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={enabledPending || !isPaid}
            />
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--accent)]" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Démarre vite avec un kit pré-fait. Tu personnalises ensuite.
              <br />
              <strong>Attention :</strong> écrase ton contenu actuel.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SITE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t.id)}
                  disabled={templatePending || !isPaid}
                  className="flex items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                >
                  <span className="text-2xl">{t.preview}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {t.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* URL personnalisée */}
        <Card>
          <CardHeader>
            <CardTitle>URL personnalisée</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Slug (a-z, 0-9, tirets) — vide = utilise l'ID">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  /site/
                </span>
                <Input
                  {...form.register("slug")}
                  placeholder={`mon-restaurant`}
                  maxLength={64}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoSlug}
                >
                  Auto
                </Button>
              </div>
            </Field>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Exemple : <code>le-tire-bouchon</code> →{" "}
              <code>/site/le-tire-bouchon</code>. Plus joli à partager.
            </p>
          </CardContent>
        </Card>

        {/* Sections toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Sections affichées</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SectionToggle
              label="À propos"
              description="Texte de présentation + image"
              checked={form.watch("sections.about")}
              onChange={(v) =>
                form.setValue("sections.about", v, { shouldDirty: true })
              }
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
              label="Notre équipe"
              description="Chef + serveurs + bio"
              checked={form.watch("sections.team")}
              onChange={(v) =>
                form.setValue("sections.team", v, { shouldDirty: true })
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
              label="FAQ"
              description="Questions fréquentes accordéon"
              checked={form.watch("sections.faq")}
              onChange={(v) =>
                form.setValue("sections.faq", v, { shouldDirty: true })
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

        {/* Hero */}
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
                    form.setValue(
                      "hero.variant",
                      v as "split" | "banner" | "centered" | "video",
                      { shouldDirty: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split (image + texte)</SelectItem>
                    <SelectItem value="banner">
                      Banner (image plein écran)
                    </SelectItem>
                    <SelectItem value="centered">
                      Centered (minimaliste, pas d&apos;image)
                    </SelectItem>
                    <SelectItem value="video">
                      Video (vidéo en fond)
                    </SelectItem>
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

            <Field label="Image hero">
              <ImageUploader
                value={form.watch("hero.imageUrl") || null}
                onChange={(url) =>
                  form.setValue("hero.imageUrl", url ?? "", {
                    shouldDirty: true,
                  })
                }
                restaurantId={restaurantId}
                kind="banniere"
                aspect="16/9"
                label="Glisse ou colle une image"
              />
            </Field>

            {form.watch("hero.variant") === "video" && (
              <Field label="URL vidéo MP4 (loop autoplay muted, ≤10s, ≤5MB)">
                <Input
                  {...form.register("hero.videoUrl")}
                  placeholder="https://… (héberge sur R2 ou Cloudinary)"
                />
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Label CTA principal">
                <Input
                  {...form.register("hero.ctaLabel")}
                  placeholder="Voir la carte"
                />
              </Field>
              <Field label="URL CTA principal">
                <Input
                  {...form.register("hero.ctaUrl")}
                  placeholder={`/carte/${restaurantId}`}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>À propos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Titre">
              <Input
                {...form.register("about.title")}
                placeholder="Notre maison"
              />
            </Field>
            <Field label="Texte (plusieurs paragraphes OK)">
              <Textarea
                rows={6}
                {...form.register("about.text")}
                placeholder="Notre histoire, notre concept, notre équipe..."
              />
            </Field>
            <Field label="Image illustrative">
              <ImageUploader
                value={form.watch("about.imageUrl") || null}
                onChange={(url) =>
                  form.setValue("about.imageUrl", url ?? "", {
                    shouldDirty: true,
                  })
                }
                restaurantId={restaurantId}
                kind="banniere"
                aspect="4/3"
                label="Photo de la salle, du chef, d'un plat"
                enablePaste={false}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Menu teaser */}
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

        {/* Gallery */}
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
                Aucune photo. Clic « Ajouter » pour démarrer.
              </p>
            ) : (
              gallery.fields.map((field, i) => (
                <GalleryRow
                  key={field.id}
                  index={i}
                  restaurantId={restaurantId}
                  currentUrl={form.watch(`gallery.${i}.url`)}
                  onChangeUrl={(url) =>
                    form.setValue(`gallery.${i}.url`, url ?? "", {
                      shouldDirty: true,
                    })
                  }
                  register={form.register}
                  onRemove={() => gallery.remove(i)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Équipe ({team.fields.length}/12)</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  team.append({ name: "", role: "", bio: "", imageUrl: "" })
                }
                disabled={team.fields.length >= 12}
              >
                <Plus className="size-3.5" />
                Ajouter
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.fields.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Aucun membre. Présente ton chef, ton sommelier, ton équipe.
              </p>
            ) : (
              team.fields.map((field, i) => (
                <TeamRow
                  key={field.id}
                  index={i}
                  restaurantId={restaurantId}
                  currentUrl={form.watch(`team.${i}.imageUrl`)}
                  onChangeUrl={(url) =>
                    form.setValue(`team.${i}.imageUrl`, url ?? "", {
                      shouldDirty: true,
                    })
                  }
                  register={form.register}
                  onRemove={() => team.remove(i)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Testimonials */}
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

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>FAQ ({faq.fields.length}/20)</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => faq.append({ question: "", answer: "" })}
                disabled={faq.fields.length >= 20}
              >
                <Plus className="size-3.5" />
                Ajouter
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faq.fields.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Aucune question. Ex : « Vous prenez les groupes ? », «
                Parking ? », « Sans gluten ? ».
              </p>
            ) : (
              faq.fields.map((field, i) => (
                <FaqRow
                  key={field.id}
                  register={form.register}
                  index={i}
                  onRemove={() => faq.remove(i)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Practical */}
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

        {/* Reservation */}
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
              <Field label="Téléphone (fallback)">
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

        {/* Style overrides */}
        <Card>
          <CardHeader>
            <CardTitle>Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Typo des titres">
                <Select
                  value={form.watch("style.fontHeading") ?? ""}
                  onValueChange={(v) =>
                    form.setValue(
                      "style.fontHeading",
                      v as "serif" | "sans" | "display",
                      { shouldDirty: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hérite du resto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serif">Serif éditoriale (Playfair)</SelectItem>
                    <SelectItem value="sans">Sans moderne (Inter)</SelectItem>
                    <SelectItem value="display">Display impact</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Couleur d'accent (override resto)">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.watch("style.accentColor") || "#b58f4a"}
                    onChange={(e) =>
                      form.setValue("style.accentColor", e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="size-10 cursor-pointer rounded-md border border-[var(--border-subtle)]"
                  />
                  <Input
                    {...form.register("style.accentColor")}
                    placeholder="Vide = couleur du resto"
                    className="font-mono"
                  />
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title (60 chars max)">
              <Input
                {...form.register("seo.title")}
                placeholder="Vide = nom resto — Restaurant à Ville"
                maxLength={60}
              />
            </Field>
            <Field label="Meta description (160 chars max)">
              <Textarea
                rows={2}
                {...form.register("seo.description")}
                placeholder="Vide = description du resto"
                maxLength={160}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-3 backdrop-blur-xl">
          <p className="text-xs text-[var(--text-muted)]">
            Save → preview refresh + CDN purge (~60s).
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={refreshPreview}
              title="Recharger la preview"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button type="submit" disabled={savePending || !isPaid}>
              {savePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
      </form>

      {/* ============ PREVIEW (right column, sticky) ============ */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 space-y-2">
          <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Preview live
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${
                  enabled ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="text-[10px] text-[var(--text-muted)]">
                {enabled ? "en ligne" : "désactivé"}
              </span>
            </div>
          </div>
          <iframe
            key={previewKey}
            ref={iframeRef}
            src={enabled ? previewUrl : "about:blank"}
            className="h-[calc(100vh-8rem)] w-full rounded-lg border border-[var(--border-subtle)] bg-white shadow-lg"
            title="Preview du site"
          />
          {!enabled && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-center text-xs text-amber-700 dark:text-amber-400">
              Active le site pour voir la preview live.
            </p>
          )}
        </div>
      </aside>
    </div>
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
  restaurantId,
  currentUrl,
  onChangeUrl,
  onRemove,
}: {
  register: UseFormRegister<Values>;
  index: number;
  restaurantId: string;
  currentUrl: string | undefined;
  onChangeUrl: (url: string | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3 sm:grid-cols-[140px_1fr_auto]">
      <ImageUploader
        value={currentUrl || null}
        onChange={onChangeUrl}
        restaurantId={restaurantId}
        kind="produit"
        aspect="1/1"
        label="Photo"
        enablePaste={false}
      />
      <div className="space-y-2">
        <Input
          placeholder="Légende (optionnel)"
          {...register(`gallery.${index}.caption` as const)}
        />
        <Input
          placeholder="Alt accessibilité"
          {...register(`gallery.${index}.alt` as const)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Supprimer cette photo"
        className="self-start"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function TeamRow({
  register,
  index,
  restaurantId,
  currentUrl,
  onChangeUrl,
  onRemove,
}: {
  register: UseFormRegister<Values>;
  index: number;
  restaurantId: string;
  currentUrl: string | undefined;
  onChangeUrl: (url: string | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3 sm:grid-cols-[120px_1fr_auto]">
      <ImageUploader
        value={currentUrl || null}
        onChange={onChangeUrl}
        restaurantId={restaurantId}
        kind="produit"
        aspect="1/1"
        label="Photo"
        enablePaste={false}
      />
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Nom"
            {...register(`team.${index}.name` as const)}
          />
          <Input
            placeholder="Rôle (Chef, Sommelier…)"
            {...register(`team.${index}.role` as const)}
          />
        </div>
        <Textarea
          rows={2}
          placeholder="Bio courte (optionnel)"
          {...register(`team.${index}.bio` as const)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Supprimer ce membre"
        className="self-start"
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
          placeholder="Source (Google, TripAdvisor…)"
          {...register(`testimonials.${index}.source` as const)}
        />
        <Input
          placeholder="Date (Mai 2026)"
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

function FaqRow({
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
      <div className="flex items-start gap-2">
        <Input
          placeholder="Question (ex: Vous prenez les groupes ?)"
          {...register(`faq.${index}.question` as const)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Supprimer cette question"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Textarea
        rows={2}
        placeholder="Réponse"
        {...register(`faq.${index}.answer` as const)}
      />
    </div>
  );
}

function blank(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const trim = s.trim();
  return trim.length === 0 ? undefined : trim;
}

// Strip les keys undefined d'un objet — pratique avant JSON.stringify pour
// que le payload reste minimal.
function cleanObj<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    const v = obj[key as keyof T];
    if (v !== undefined && v !== "") {
      out[key as keyof T] = v;
    }
  }
  return out;
}

