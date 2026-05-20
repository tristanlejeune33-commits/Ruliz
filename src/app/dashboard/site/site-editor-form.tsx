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
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
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
import { ImageUploader } from "@/components/shared/image-uploader";
import { slugify } from "@/lib/slugify";
import type { RestaurantConfig } from "@/features/restaurant-site-v2/types";
import {
  getSiteV2QrDataUrl,
  saveSiteV2Config,
  toggleSiteV2Enabled,
  type SiteV2ConfigInput,
} from "@/server/dashboard/site-v2-actions";

/**
 * Formulaire éditeur du site v2.
 *
 * Le restaurateur édite le contenu ÉDITORIAL (ce qui n'est pas déjà dans
 * son onglet "Mon restaurant") :
 *   - tagline, established
 *   - accentColor, typographyPreset
 *   - hero layout (banner/split), theme (light/dark), aboutImageLeft
 *   - about (title, body paragraphes, image, signature)
 *   - menuTeaser.title (les items sont les top-4 produits auto)
 *   - gallery (URLs R2)
 *   - testimonials (rating, text, author)
 *   - reservationUrl
 *   - section toggles
 *   - slug URL
 *
 * Adresse, téléphone, email, horaires, socials = pull auto depuis
 * `restaurants` (cf. /dashboard/restaurant pour les éditer).
 */

const schema = z.object({
  slug: z.string().max(64).optional(),
  tagline: z.string().max(255).optional(),
  established: z
    .number()
    .int()
    .min(1800)
    .max(2100)
    .optional()
    .or(z.nan()),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$|^oklch\(.+\)$/i, "Hex ou oklch")
    .optional()
    .or(z.literal("")),
  typographyPreset: z.enum(["editorial", "modern", "classic"]),
  about: z.object({
    title: z.string().max(255).optional(),
    body: z.array(z.object({ text: z.string().max(2000) })).max(6),
    image: z.string().max(500).optional(),
    signature: z.string().max(120).optional(),
  }),
  menuTeaserTitle: z.string().max(255).optional(),
  gallery: z.array(z.object({ url: z.string().min(1).max(500) })).max(12),
  testimonials: z
    .array(
      z.object({
        rating: z.number().min(0).max(5),
        text: z.string().min(1).max(2000),
        author: z.string().min(1).max(120),
      }),
    )
    .max(12),
  reservationUrl: z.string().max(500).optional().or(z.literal("")),
  options: z.object({
    showGallery: z.boolean(),
    showTestimonials: z.boolean(),
    showReservation: z.boolean(),
    theme: z.enum(["light", "dark"]),
    aboutImageLeft: z.boolean(),
    heroLayout: z.enum(["banner", "split"]),
  }),
});

type Values = z.infer<typeof schema>;

interface SiteV2EditorFormProps {
  restaurantId: string;
  initialConfig: RestaurantConfig | null;
  initialEnabled: boolean;
  initialSlug: string | null;
  plan: "freemium" | "pro" | "premium";
}

export function SiteV2EditorForm({
  restaurantId,
  initialConfig,
  initialEnabled,
  initialSlug,
  plan,
}: SiteV2EditorFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [enabledPending, startEnabledTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const [qrPending, startQrTransition] = useTransition();
  const [qrModal, setQrModal] = useState<{ dataUrl: string; url: string } | null>(
    null,
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPaid = plan === "pro" || plan === "premium";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: initialSlug ?? "",
      tagline: initialConfig?.tagline ?? "",
      established:
        initialConfig?.established ?? new Date().getFullYear(),
      accentColor: initialConfig?.accentColor ?? "",
      typographyPreset: initialConfig?.typographyPreset ?? "editorial",
      about: {
        title: initialConfig?.about.title ?? "",
        body: (initialConfig?.about.body ?? [""]).map((text) => ({ text })),
        image: initialConfig?.about.image ?? "",
        signature: initialConfig?.about.signature ?? "",
      },
      menuTeaserTitle: initialConfig?.menuTeaser.title ?? "",
      gallery: (initialConfig?.gallery ?? []).map((url) => ({ url })),
      testimonials: initialConfig?.testimonials ?? [],
      reservationUrl: initialConfig?.reservationUrl ?? "",
      options: {
        showGallery: initialConfig?.options.showGallery ?? false,
        showTestimonials: initialConfig?.options.showTestimonials ?? false,
        showReservation: initialConfig?.options.showReservation ?? false,
        theme: initialConfig?.options.theme ?? "light",
        aboutImageLeft: initialConfig?.options.aboutImageLeft ?? true,
        heroLayout: initialConfig?.options.heroLayout ?? "banner",
      },
    },
  });

  const aboutBody = useFieldArray({ control: form.control, name: "about.body" });
  const gallery = useFieldArray({ control: form.control, name: "gallery" });
  const testimonials = useFieldArray({
    control: form.control,
    name: "testimonials",
  });

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  const onSubmit = (values: Values) => {
    startSaveTransition(async () => {
      const payload: SiteV2ConfigInput = {
        version: 2,
        tagline: blank(values.tagline),
        established:
          Number.isFinite(values.established) && values.established
            ? values.established
            : undefined,
        accentColor: blank(values.accentColor),
        typographyPreset: values.typographyPreset,
        about: {
          title: blank(values.about.title),
          body: values.about.body.map((b) => b.text).filter((t) => t.trim()),
          image: blank(values.about.image),
          signature: blank(values.about.signature),
        },
        menuTeaser: blank(values.menuTeaserTitle)
          ? { title: blank(values.menuTeaserTitle) }
          : undefined,
        gallery: values.gallery.map((g) => g.url).filter(Boolean),
        testimonials: values.testimonials,
        reservationUrl: blank(values.reservationUrl) ?? "",
        options: values.options,
        slug: values.slug?.trim() || undefined,
      };

      const res = await saveSiteV2Config(payload);
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
      const res = await toggleSiteV2Enabled(next);
      if (res.ok) {
        setEnabled(next);
        toast.success(next ? "Site activé." : "Site désactivé.");
        refreshPreview();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleAutoSlug = () => {
    const tagline = form.getValues("tagline") ?? "";
    const base = slugify(tagline.slice(0, 30) || `resto-${restaurantId}`);
    form.setValue("slug", base, { shouldDirty: true });
  };

  const handleDownloadQr = () => {
    startQrTransition(async () => {
      const res = await getSiteV2QrDataUrl();
      if (res.ok) {
        setQrModal({ dataUrl: res.dataUrl, url: res.url });
      } else {
        toast.error(res.error);
      }
    });
  };

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

        {/* Toggle + QR */}
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                disabled={!enabled || qrPending}
              >
                {qrPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <QrCode className="size-3.5" />
                )}
                QR site
              </Button>
              <Switch
                checked={enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={enabledPending || !isPaid}
              />
            </div>
          </CardContent>
        </Card>

        {qrModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setQrModal(null)}
          >
            <div
              className="max-w-sm rounded-xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-semibold text-black">
                QR code de ton site
              </h3>
              <p className="mb-4 text-xs text-gray-600">
                URL : <code className="text-[10px]">{qrModal.url}</code>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrModal.dataUrl}
                alt="QR code site"
                className="mx-auto block aspect-square w-64"
              />
              <div className="mt-4 flex gap-2">
                <Button asChild className="flex-1">
                  <a
                    href={qrModal.dataUrl}
                    download={`qr-site-${slug ?? restaurantId}.png`}
                  >
                    <Download className="size-3.5" />
                    Télécharger PNG
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setQrModal(null)}
                  className="flex-1"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* URL personnalisée */}
        <Card>
          <CardHeader>
            <CardTitle>URL personnalisée</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Slug (vide = utilise l'ID numérique)">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">/site/</span>
                <Input
                  {...form.register("slug")}
                  placeholder="le-tire-bouchon"
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
              Plus joli à partager. <code>le-tire-bouchon</code> →{" "}
              <code>/site/le-tire-bouchon</code>.
            </p>
          </CardContent>
        </Card>

        {/* Identité éditoriale */}
        <Card>
          <CardHeader>
            <CardTitle>Identité éditoriale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Tagline (phrase d'accroche hero + footer)">
              <Input
                {...form.register("tagline")}
                placeholder="Bistrot moderne, produits du marché, vins vivants."
                maxLength={255}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Année d'ouverture">
                <Input
                  type="number"
                  min={1800}
                  max={2100}
                  {...form.register("established", { valueAsNumber: true })}
                />
              </Field>
              <Field label="URL de réservation (TheFork, Zenchef…)">
                <Input
                  {...form.register("reservationUrl")}
                  placeholder="https://thefork.fr/…"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Style global */}
        <Card>
          <CardHeader>
            <CardTitle>Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hero layout">
                <Select
                  value={form.watch("options.heroLayout")}
                  onValueChange={(v) =>
                    form.setValue(
                      "options.heroLayout",
                      v as "banner" | "split",
                      { shouldDirty: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">
                      Banner (image plein écran)
                    </SelectItem>
                    <SelectItem value="split">
                      Split (50/50 image + texte)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Thème">
                <Select
                  value={form.watch("options.theme")}
                  onValueChange={(v) =>
                    form.setValue("options.theme", v as "light" | "dark", {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light (recommandé)</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Typographie">
                <Select
                  value={form.watch("typographyPreset")}
                  onValueChange={(v) =>
                    form.setValue(
                      "typographyPreset",
                      v as "editorial" | "modern" | "classic",
                      { shouldDirty: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editorial">
                      Editorial (Instrument Serif italic)
                    </SelectItem>
                    <SelectItem value="modern">
                      Modern (Geist sans-serif)
                    </SelectItem>
                    <SelectItem value="classic">
                      Classic (EB Garamond)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Couleur d'accent (vide = couleur du resto)">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      form.watch("accentColor")?.startsWith("#")
                        ? form.watch("accentColor")
                        : "#6b2a18"
                    }
                    onChange={(e) =>
                      form.setValue("accentColor", e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="size-10 cursor-pointer rounded-md border border-[var(--border-subtle)]"
                  />
                  <Input
                    {...form.register("accentColor")}
                    placeholder="#6b2a18 ou oklch(0.42 0.13 22)"
                    className="font-mono text-xs"
                  />
                </div>
              </Field>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Photo About à gauche
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Désactive pour inverser (texte gauche, photo droite).
                </p>
              </div>
              <Switch
                checked={form.watch("options.aboutImageLeft")}
                onCheckedChange={(v) =>
                  form.setValue("options.aboutImageLeft", v, {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>À propos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Titre de la section">
              <Input
                {...form.register("about.title")}
                placeholder="Le bistrot que vous auriez aimé tenir."
              />
            </Field>

            <div className="space-y-2">
              <Label className="text-xs">
                Paragraphes ({aboutBody.fields.length}/6)
              </Label>
              {aboutBody.fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Textarea
                    rows={3}
                    placeholder={`Paragraphe ${i + 1}`}
                    {...form.register(`about.body.${i}.text` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => aboutBody.remove(i)}
                    disabled={aboutBody.fields.length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              {aboutBody.fields.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => aboutBody.append({ text: "" })}
                >
                  <Plus className="size-3.5" />
                  Paragraphe
                </Button>
              )}
            </div>

            <Field label="Image d'illustration">
              <ImageUploader
                value={form.watch("about.image") || null}
                onChange={(url) =>
                  form.setValue("about.image", url ?? "", { shouldDirty: true })
                }
                restaurantId={restaurantId}
                kind="banniere"
                aspect="4/5"
                label="Photo du chef, de la salle, d'un plat signature"
                enablePaste={false}
              />
            </Field>

            <Field label="Signature (optionnel)">
              <Input
                {...form.register("about.signature")}
                placeholder="— Camille L., cheffe & propriétaire"
                maxLength={120}
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
            <Field label="Titre">
              <Input
                {...form.register("menuTeaserTitle")}
                placeholder="Une cuisine. Trois mouvements."
              />
            </Field>
            <p className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3 text-xs text-[var(--text-muted)]">
              Les 4 plats affichés sont automatiquement tirés des 4 premiers
              produits visibles dans ta carte (triés par ordre des catégories).
              Pour modifier l&apos;ordre, va dans{" "}
              <a
                href="/dashboard/menu"
                className="text-[var(--accent)] underline hover:no-underline"
              >
                Éditeur de carte
              </a>{" "}
              et drag-drop tes produits.
            </p>
          </CardContent>
        </Card>

        {/* Sections toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Sections affichées</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <SectionToggle
              label="Galerie"
              checked={form.watch("options.showGallery")}
              onChange={(v) =>
                form.setValue("options.showGallery", v, { shouldDirty: true })
              }
            />
            <SectionToggle
              label="Témoignages"
              checked={form.watch("options.showTestimonials")}
              onChange={(v) =>
                form.setValue("options.showTestimonials", v, {
                  shouldDirty: true,
                })
              }
            />
            <SectionToggle
              label="Bandeau Réservation"
              checked={form.watch("options.showReservation")}
              onChange={(v) =>
                form.setValue("options.showReservation", v, {
                  shouldDirty: true,
                })
              }
            />
          </CardContent>
        </Card>

        {/* Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Galerie ({gallery.fields.length}/12)</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => gallery.append({ url: "" })}
                disabled={gallery.fields.length >= 12}
              >
                <Plus className="size-3.5" />
                Ajouter
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gallery.fields.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Aucune photo. Le pattern bento s&apos;active à partir de 6
                photos (idéalement 8).
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
                  onRemove={() => gallery.remove(i)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Testimonials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Témoignages ({testimonials.fields.length}/12)</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  testimonials.append({
                    rating: 5,
                    text: "",
                    author: "",
                  })
                }
                disabled={testimonials.fields.length >= 12}
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

        {/* Practical sync banner */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle>Infos pratiques (synchronisées)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-[var(--text-muted)]">
              Téléphone, email, adresse, code postal, ville, horaires
              d&apos;ouverture, réseaux sociaux et Google Maps sont
              auto-pullés depuis{" "}
              <a
                href="/dashboard/restaurant"
                className="text-[var(--accent)] underline hover:no-underline"
              >
                Mon restaurant
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-3 backdrop-blur-xl">
          <p className="text-xs text-[var(--text-muted)]">
            Save → preview refresh + CDN purge (~120s).
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3">
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function GalleryRow({
  index,
  restaurantId,
  currentUrl,
  onChangeUrl,
  onRemove,
}: {
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
        label={`Photo ${index + 1}`}
        enablePaste={false}
      />
      <div className="flex items-center text-xs text-[var(--text-muted)]">
        {currentUrl ? "Image OK" : "Glisse ou colle une image"}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
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
      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <Input
          placeholder="Auteur (ex: Marie D. · Le Fooding)"
          {...register(`testimonials.${index}.author` as const)}
        />
        <Input
          type="number"
          min={0}
          max={5}
          step={1}
          placeholder="Note (0-5)"
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
        placeholder="Citation"
        {...register(`testimonials.${index}.text` as const)}
      />
    </div>
  );
}

function blank(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const trim = s.trim();
  return trim.length === 0 ? undefined : trim;
}
