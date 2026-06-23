"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { upsertJeu } from "@/server/dashboard/jeu-actions";
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator";
import { useAutoSave } from "@/lib/use-auto-save";

const schema = z.object({
  nom: z.string().min(1).max(255),
  actif: z.boolean(),
  cta: z.string().min(1).max(255),
  requireGoogleReview: z.boolean(),
  autoPopup: z.boolean(),
  autoPopupDelaySec: z.number().int().min(0).max(60),
  /** ISO 8601 ou chaîne vide */
  dateDebut: z.string(),
  dateFin: z.string(),
  lots: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        probabilite: z.number().int().min(1).max(100),
        /** URL d'image/logo du lot (uploaded via R2 ou collé). Vide = pas de logo. */
        imageUrl: z.string().max(500).optional().or(z.literal("")),
        /** Stock de ce lot. Vide/absent = illimité ; 0 = épuisé (masqué) ; N = N gains. */
        maxWins: z.number().int().min(0).max(1_000_000).optional(),
      }),
    )
    .min(1)
    .max(12),
});

type Values = z.infer<typeof schema>;

interface JeuFormProps {
  restaurantId: string;
  jeu: {
    id: string;
    nom: string;
    actif: boolean;
    cta: string;
    lots: Array<{
      label: string;
      probabilite: number;
      imageUrl?: string;
      maxWins?: number;
    }>;
    requireGoogleReview: boolean;
    autoPopup: boolean;
    autoPopupDelaySec: number;
    dateDebut: string;
    dateFin: string;
  } | null;
}

const DEFAULT_LOTS: Array<{
  label: string;
  probabilite: number;
  imageUrl?: string;
  maxWins?: number;
}> = [
  // Pas de maxWins → stock illimité par défaut.
  { label: "☕ Café offert", probabilite: 40, imageUrl: "" },
  { label: "🍰 Dessert offert", probabilite: 25, imageUrl: "" },
  { label: "🍹 Apéritif maison", probabilite: 20, imageUrl: "" },
  { label: "💸 -10% sur ta prochaine note", probabilite: 10, imageUrl: "" },
  { label: "🎁 Menu offert pour 2", probabilite: 5, imageUrl: "" },
];

/**
 * Extrait le premier emoji présent au début d'un label.
 * Ex: "🎁 Café offert" → "🎁"
 * Ex: "Bon d'achat" → ""
 *
 * Utilisé par le picker emoji natif pour afficher l'emoji actuel dans l'input
 * sans afficher le reste du texte du label.
 */
function extractEmojiFromLabel(label: string): string {
  const match = label.match(
    /^([\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+)/u,
  );
  return match ? match[1] ?? "" : "";
}

export function JeuForm({ restaurantId, jeu }: JeuFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: jeu
      ? {
          nom: jeu.nom,
          actif: jeu.actif,
          cta: jeu.cta || "Laisse-nous un avis Google et tente de gagner !",
          requireGoogleReview: jeu.requireGoogleReview,
          autoPopup: jeu.autoPopup ?? false,
          autoPopupDelaySec: jeu.autoPopupDelaySec ?? 3,
          dateDebut: jeu.dateDebut ?? "",
          dateFin: jeu.dateFin ?? "",
          lots:
            jeu.lots.length > 0
              ? jeu.lots.map((l) => ({
                  label: l.label,
                  probabilite: l.probabilite,
                  imageUrl: l.imageUrl ?? "",
                  // undefined = illimité (on ne force plus 0).
                  maxWins: l.maxWins,
                }))
              : DEFAULT_LOTS,
        }
      : {
          nom: "Roulette des avis",
          actif: true,
          cta: "Laisse-nous un avis Google et tente de gagner !",
          requireGoogleReview: true,
          autoPopup: false,
          autoPopupDelaySec: 3,
          dateDebut: "",
          dateFin: "",
          lots: DEFAULT_LOTS,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lots",
  });

  const lots = form.watch("lots");
  const total = lots.reduce((acc, l) => acc + (Number(l.probabilite) || 0), 0);
  const isTotalOk = total >= 95 && total <= 105;

  // Auto-fill : ajuste le DERNIER lot pour que la somme fasse exactement 100
  const autoFillTo100 = () => {
    if (lots.length === 0) return;
    const lastIdx = lots.length - 1;
    const others = lots.slice(0, -1).reduce(
      (acc, l) => acc + (Number(l.probabilite) || 0),
      0,
    );
    const remainder = Math.max(0, 100 - others);
    form.setValue(`lots.${lastIdx}.probabilite`, remainder, {
      shouldDirty: true,
    });
    toast.success(
      `Dernier lot ajusté à ${remainder}% pour que le total fasse 100%.`,
    );
  };

  // Distribue uniformément 100% entre tous les lots
  const distribuerUniformement = () => {
    if (lots.length === 0) return;
    const base = Math.floor(100 / lots.length);
    const remainder = 100 - base * lots.length;
    lots.forEach((_, i) => {
      form.setValue(
        `lots.${i}.probabilite`,
        i === lots.length - 1 ? base + remainder : base,
        { shouldDirty: true },
      );
    });
    toast.success(`Probabilités distribuées uniformément (${base}% chacun).`);
  };

  // Helper pour réutiliser dans onSubmit ET useAutoSave
  const persist = async (values: Values) => {
    return upsertJeu({
      restaurantId,
      jeuId: jeu?.id ?? null,
      nom: values.nom,
      actif: values.actif,
      autoPopup: values.autoPopup,
      autoPopupDelaySec: values.autoPopupDelaySec,
      dateDebut: values.dateDebut || null,
      dateFin: values.dateFin || null,
      config: {
        cta: values.cta,
        lots: values.lots,
        require_google_review: values.requireGoogleReview,
      },
    });
  };

  // Auto-save uniquement si le jeu existe déjà (sinon on attend le 1er save manuel
  // qui va le créer avec les valeurs par défaut)
  const { status: autoSaveStatus, errorMessage: autoSaveError } = useAutoSave({
    form,
    onSave: persist,
    delayMs: 2000,
    enabled: !!jeu,
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await persist(values);
      if (res.ok) {
        toast.success(jeu ? "Roulette mise à jour" : "Roulette créée");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Le client choisit son lot, on capte ses coordonnées en échange.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du jeu (interne)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message d&apos;invitation</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Affiché en haut de la modale roulette sur la carte publique.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actif"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                  <FormControl>
                    <Switch
                      id="actif"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <Label htmlFor="actif" className="cursor-pointer">
                      Jeu activé
                    </Label>
                    <FormDescription>
                      Décoche pour mettre en pause sans supprimer la config.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requireGoogleReview"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                  <FormControl>
                    <Switch
                      id="reviewRequired"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <Label htmlFor="reviewRequired" className="cursor-pointer">
                      Demander un avis Google avant de jouer
                    </Label>
                    <FormDescription>
                      Le bouton Spin redirige d&apos;abord vers ton lien Google Review.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* AUTO-POPUP : ouverture automatique du modal à l'ouverture de la carte */}
            <FormField
              control={form.control}
              name="autoPopup"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                  <FormControl>
                    <Switch
                      id="autoPopup"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <Label htmlFor="autoPopup" className="cursor-pointer">
                      Pop-up automatique à l&apos;ouverture
                    </Label>
                    <FormDescription>
                      Le modal s&apos;affiche tout seul quand un client scanne le
                      QR code. 1 fois par session navigateur.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("autoPopup") && (
              <FormField
                control={form.control}
                name="autoPopupDelaySec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai avant l&apos;auto-popup (secondes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Conseillé : 3 à 10s. Trop court = intrusif, trop long = le
                      client est déjà parti scroller la carte.
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            {/* PROGRAMMATION : dates de début/fin */}
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
              <Label className="mb-2 block">Programmation (optionnel)</Label>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Le jeu s&apos;active uniquement entre ces deux dates. Laisse vide
                pour qu&apos;il tourne en permanence tant qu&apos;il est activé.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateDebut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date de début</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateFin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date de fin</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Lots et probabilités</CardTitle>
                <CardDescription>
                  La somme des probabilités doit faire <strong>100%</strong>.
                  Tu peux mettre des emojis dans le label (ex : « 🎁 Café offert »).
                  La colonne <strong>Stock</strong> limite le nombre de fois où
                  un lot peut être gagné : <strong>vide = illimité</strong>,{" "}
                  <strong>0 = épuisé</strong> (masqué), <strong>N</strong> = N
                  gains. Une fois épuisé, le lot n&apos;est plus tiré ni affiché.
                  Maximum 12 lots.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    isTotalOk
                      ? "rounded-md bg-[var(--neon-success-soft)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--neon-success)]"
                      : "rounded-md bg-[var(--neon-danger-soft)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--neon-danger)]"
                  }
                >
                  Total : {total}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={autoFillTo100}
                  title="Ajuste le dernier lot pour atteindre 100%"
                >
                  Compléter à 100%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={distribuerUniformement}
                  title="Donne le même % à tous les lots"
                >
                  Distribuer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {fields.map((f, i) => (
                <li
                  key={f.id}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-3"
                >
                  <div className="grid grid-cols-[1fr_64px_64px_40px] gap-2 sm:grid-cols-[1fr_84px_84px_40px]">
                    <FormField
                      control={form.control}
                      name={`lots.${i}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="🎁 Label du lot (avec emoji)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lots.${i}.probabilite`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) || 0)
                              }
                              placeholder="%"
                              title="Probabilité (%)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lots.${i}.maxWins`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                // Vide = illimité (undefined). 0 = épuisé.
                                field.onChange(
                                  v === ""
                                    ? undefined
                                    : Math.max(0, Math.floor(Number(v) || 0)),
                                );
                              }}
                              placeholder="∞"
                              title="Stock de ce lot — vide = illimité, 0 = épuisé, N = N gains"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      aria-label="Supprimer le lot"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 grid grid-cols-[1fr_64px_64px_40px] gap-2 sm:grid-cols-[1fr_84px_84px_40px]">
                    <span />
                    <span className="text-center text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">
                      Proba %
                    </span>
                    <span className="text-center text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">
                      Stock
                    </span>
                    <span />
                  </div>

                  {/* Sélecteur d'emoji NATIF utilise le picker système
                      (Windows Win+. / macOS Cmd+Ctrl+Space / iOS et Android
                      affichent automatiquement leur clavier emoji quand le
                      focus tombe sur un input avec inputMode="text" qui
                      contient déjà un emoji).
                      L'utilisateur tape un emoji directement → injecté au
                      début du label. Accès à toute la palette système, pas
                      besoin de hardcoder une liste limitée. */}
                  <FormField
                    control={form.control}
                    name={`lots.${i}.label`}
                    render={({ field }) => {
                      const currentEmoji = extractEmojiFromLabel(
                        field.value || "",
                      );
                      const handlePickEmoji = (emoji: string) => {
                        const current = field.value || "";
                        const stripped = current.replace(
                          /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u,
                          "",
                        );
                        field.onChange(`${emoji} ${stripped}`.trim());
                      };
                      return (
                        <FormItem className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                              Emoji :
                            </span>
                            {/* Click sur le bouton → ouvre directement le
                                picker (Popover avec grille catégorisée). Plus
                                besoin de connaître Win+. ou Cmd+Ctrl+Espace. */}
                            <EmojiPicker onSelect={handlePickEmoji}>
                              <button
                                type="button"
                                className="flex h-9 w-14 items-center justify-center rounded-md border border-[var(--border-glass-hover)] bg-[var(--bg-elevated)] text-center text-lg outline-none transition-colors hover:bg-[var(--bg-glass-hover)] focus:border-[var(--accent)]"
                                aria-label="Choisir un emoji"
                              >
                                {currentEmoji || (
                                  <span className="text-[var(--text-tertiary)]">
                                    🎁
                                  </span>
                                )}
                              </button>
                            </EmojiPicker>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              Click pour choisir parmi 250+ emojis classés
                            </p>
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                append({ label: "", probabilite: 5, imageUrl: "" })
              }
              disabled={fields.length >= 12}
              className="mt-3"
            >
              <Plus className="size-3.5" />
              Ajouter un lot
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <AutoSaveIndicator
            status={autoSaveStatus}
            errorMessage={autoSaveError}
          />
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Enregistrer
          </Button>
        </div>

      </form>
    </Form>
  );
}

function RoulettePreview({
  lots,
}: {
  lots: Array<{ label: string; probabilite: number }>;
}) {
  const valid = lots.filter((l) => l.label && l.probabilite > 0);
  if (valid.length === 0) return null;
  const total = valid.reduce((acc, l) => acc + l.probabilite, 0);
  const colors = [
    "var(--accent)",
    "oklch(0.7 0.2 25)",
    "oklch(0.7 0.2 145)",
    "oklch(0.65 0.2 280)",
    "oklch(0.7 0.2 60)",
    "oklch(0.7 0.2 200)",
    "oklch(0.65 0.2 320)",
    "oklch(0.65 0.2 100)",
  ];

  // Pre-compute segments to avoid mutating during render.
  const segments: Array<{
    lot: { label: string; probabilite: number };
    startAngle: number;
    angle: number;
    color: string;
  }> = [];
  let cumulative = 0;
  for (let i = 0; i < valid.length; i++) {
    const lot = valid[i]!;
    const angle = (lot.probabilite / total) * 360;
    segments.push({
      lot,
      startAngle: cumulative,
      angle,
      color: colors[i % colors.length] ?? colors[0]!,
    });
    cumulative += angle;
  }

  return (
    <svg viewBox="0 0 200 200" className="size-64">
      {segments.map((seg, i) => {
        const angle = seg.angle;
        const startAngle = seg.startAngle;
        const endAngle = startAngle + angle;

        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const x1 = 100 + 90 * Math.cos(startRad);
        const y1 = 100 + 90 * Math.sin(startRad);
        const x2 = 100 + 90 * Math.cos(endRad);
        const y2 = 100 + 90 * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        const midRad = ((startAngle + angle / 2 - 90) * Math.PI) / 180;
        const labelX = 100 + 55 * Math.cos(midRad);
        const labelY = 100 + 55 * Math.sin(midRad);

        return (
          <g key={i}>
            <path
              d={`M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={seg.color}
              opacity={0.8}
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              alignmentBaseline="middle"
              className="fill-white text-[6px] font-medium"
              transform={`rotate(${
                startAngle + angle / 2
              } ${labelX} ${labelY})`}
            >
              {seg.lot.label.length > 16
                ? seg.lot.label.slice(0, 14) + "…"
                : seg.lot.label}
            </text>
          </g>
        );
      })}
      <circle cx={100} cy={100} r={12} fill="white" stroke="var(--accent)" strokeWidth={3} />
    </svg>
  );
}
