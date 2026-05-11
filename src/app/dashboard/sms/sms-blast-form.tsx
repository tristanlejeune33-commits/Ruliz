"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  Send,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  estimateSmsBlast,
  sendSmsBlast,
} from "@/server/dashboard/sms-actions";

// Nettoie le sender côté client : alphanumérique seulement, max 11 chars,
// sans accent ni espace. Mêmes règles que le serveur.
function cleanSenderInput(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 11);
}

const schema = z.object({
  title: z.string().max(255).optional(),
  message: z.string().min(1, "Requis").max(640),
  filterSource: z.enum(["all", "roulette", "manual"]),
  sender: z
    .string()
    .min(1, "Indique un nom")
    .max(11, "11 caractères max")
    .regex(/^[a-zA-Z0-9]+$/, "Lettres et chiffres uniquement"),
});
type Values = z.infer<typeof schema>;

export interface ManualClient {
  id: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
}

interface SmsBlastFormProps {
  restaurantId: string;
  currentBalance: number;
  defaultSender: string;
  manualClients: ManualClient[];
}

const TAGS = [
  { label: "{prenom}", desc: "Prénom du client" },
  { label: "{nom}", desc: "Nom de famille" },
  { label: "{resto}", desc: "Nom de ton restaurant" },
];

export function SmsBlastForm({
  restaurantId,
  currentBalance,
  defaultSender,
  manualClients,
}: SmsBlastFormProps) {
  const [pending, startTransition] = useTransition();
  const [estimate, setEstimate] = useState<{
    recipientCount: number;
    segmentsPerSms: number;
    estimatedTokens: number;
    balanceAfter: number;
    enough: boolean;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Sélection des clients en mode manual (Set d'IDs)
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    () => new Set(manualClients.map((c) => c.id)), // tous cochés par défaut
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      message: "",
      filterSource: "all",
      sender: defaultSender || "Ruliz",
    },
  });

  const message = form.watch("message");
  const filterSource = form.watch("filterSource");
  const sender = form.watch("sender");

  // Estimation côté serveur (debounce 500 ms)
  useEffect(() => {
    if (!message.trim()) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(() => {
      void estimateSmsBlast({
        restaurantId,
        message,
        filterSource,
        selectedClientIds:
          filterSource === "manual" ? Array.from(selectedClientIds) : undefined,
      }).then(setEstimate);
    }, 500);
    return () => clearTimeout(timer);
  }, [message, filterSource, restaurantId, selectedClientIds]);

  const insertTag = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = message.slice(0, start) + tag + message.slice(end);
    form.setValue("message", next, { shouldDirty: true });
    // Replace cursor after the tag
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await sendSmsBlast({
        restaurantId,
        ...values,
        selectedClientIds:
          values.filterSource === "manual"
            ? Array.from(selectedClientIds)
            : undefined,
      });
      if (res.ok && res.data) {
        toast.success(
          `✅ Envoyés : ${res.data.sent} · ${res.data.tokensSpent} SMS utilisés`,
        );
        form.reset({
          title: "",
          message: "",
          filterSource: values.filterSource,
          sender: values.sender,
        });
        setEstimate(null);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const canSend =
    estimate &&
    estimate.enough &&
    estimate.recipientCount > 0 &&
    message.trim().length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* === ÉDITION === */}
          <div className="space-y-4">
            {/* Titre interne (pour l'historique) */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Nom de la campagne (interne, pour retrouver dans l&apos;historique)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Soirée vins du jeudi"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Nom expéditeur — affiché sur le téléphone du client */}
            <FormField
              control={form.control}
              name="sender"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Nom de l&apos;expéditeur</FormLabel>
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        sender.length >= 11
                          ? "text-[var(--neon-violet)]"
                          : "text-[var(--text-tertiary)]",
                      )}
                    >
                      {sender.length}/11
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="LeBistrot"
                      maxLength={11}
                      value={field.value}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        // Nettoie automatiquement (alphanumérique + 11 chars)
                        field.onChange(cleanSenderInput(e.target.value));
                      }}
                      className="font-mono"
                    />
                  </FormControl>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Ce nom apparaîtra sur le téléphone de tes clients à la
                    place de ton numéro. 11 caractères max, lettres et
                    chiffres uniquement (pas d&apos;espace ni d&apos;accent).
                    Ton choix est mémorisé pour la prochaine fois.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Message</FormLabel>
                    <CharCounter
                      count={message.length}
                      tone={
                        message.length === 0
                          ? "neutral"
                          : message.length > 160
                            ? "warning"
                            : "neutral"
                      }
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      rows={5}
                      maxLength={640}
                      ref={(e) => {
                        field.ref(e);
                        textareaRef.current = e;
                      }}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      value={field.value}
                      name={field.name}
                      placeholder="Salut {prenom} ! Soirée vins du Beaujolais ce jeudi 19h au {resto}. Réserve par SMS 🍷"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Boutons d'insertion de tags */}
            <div>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                Clic pour insérer un tag personnalisé :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => insertTag(t.label)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-xs font-mono text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
                    title={t.desc}
                  >
                    <Tag className="size-2.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="filterSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>À qui envoyer</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Tous les contacts</SelectItem>
                      <SelectItem value="roulette">
                        Issus de la roulette d&apos;avis
                      </SelectItem>
                      <SelectItem value="manual">
                        Clients ajoutés manuellement (sélection)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* === SÉLECTION MANUELLE DES CLIENTS === */}
            {filterSource === "manual" && (
              <ManualClientsPicker
                clients={manualClients}
                selected={selectedClientIds}
                onChange={setSelectedClientIds}
              />
            )}

            {/* === ESTIMATION DU COÛT === */}
            {estimate && (
              <EstimateBox
                recipientCount={estimate.recipientCount}
                segmentsPerSms={estimate.segmentsPerSms}
                estimatedTokens={estimate.estimatedTokens}
                balanceAfter={estimate.balanceAfter}
                enough={estimate.enough}
                currentBalance={currentBalance}
              />
            )}
          </div>

          {/* === PREVIEW SMS === */}
          <SmsPreview message={message || ""} sender={sender || "Ruliz"} />
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={pending || !canSend}
            className="w-full sm:w-auto"
            size="lg"
            variant="primary"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {estimate && estimate.estimatedTokens > 0
              ? `Envoyer (${estimate.estimatedTokens} SMS)`
              : "Envoyer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CharCounter({
  count,
  tone,
}: {
  count: number;
  tone: "neutral" | "warning";
}) {
  const segments = count === 0 ? 0 : Math.ceil(count / 160);
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] tabular-nums",
        tone === "warning"
          ? "text-[var(--neon-violet)]"
          : "text-[var(--text-tertiary)]",
      )}
    >
      <span>{count} caractères</span>
      {segments > 1 && (
        <>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span>{segments} SMS chacun</span>
        </>
      )}
    </span>
  );
}

function EstimateBox({
  recipientCount,
  segmentsPerSms,
  estimatedTokens,
  balanceAfter,
  enough,
  currentBalance,
}: {
  recipientCount: number;
  segmentsPerSms: number;
  estimatedTokens: number;
  balanceAfter: number;
  enough: boolean;
  currentBalance: number;
}) {
  if (recipientCount === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-3 text-xs text-[var(--text-secondary)]">
        <AlertTriangle className="size-4 shrink-0 text-[var(--neon-violet)]" />
        <p>
          Aucun destinataire trouvé avec ce filtre. Vérifie que tes clients ont
          bien laissé leur téléphone via la roulette.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        enough
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/8"
          : "border-[rgb(217,119,6)]/40 bg-[rgba(245,158,11,0.08)] text-[rgb(146,64,14)]",
      )}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">
            Destinataires
          </p>
          <p className="text-lg font-semibold tabular-nums">{recipientCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">
            Coût estimé
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {estimatedTokens} SMS
          </p>
          {segmentsPerSms > 1 && (
            <p className="text-[10px] opacity-70">
              ({segmentsPerSms} SMS par destinataire car message long)
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">
            Solde après envoi
          </p>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums",
              !enough && "text-[rgb(146,64,14)]",
            )}
          >
            {balanceAfter}
          </p>
        </div>
      </div>
      {!enough && (
        <p className="mt-2 flex items-start gap-2 border-t border-current/20 pt-2 text-xs font-medium">
          <AlertTriangle className="size-3.5 shrink-0" />
          Solde insuffisant. Il te faut {estimatedTokens - currentBalance} SMS
          de plus. Achète un pack ci-dessous pour continuer.
        </p>
      )}
    </div>
  );
}

/**
 * Picker multi-select pour choisir précisément quels clients ajoutés
 * manuellement vont recevoir le SMS. Affiché uniquement quand
 * filterSource === "manual". Cocher = inclus, décocher = exclu.
 */
function ManualClientsPicker({
  clients,
  selected,
  onChange,
}: {
  clients: ManualClient[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 p-4 text-center text-xs text-[var(--text-muted)]">
        Aucun client ajouté manuellement pour l&apos;instant.{" "}
        <a
          href="/dashboard/clients"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Ajoute des clients ici
        </a>{" "}
        pour pouvoir les sélectionner.
      </div>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleAll = () => {
    if (selected.size === clients.length) {
      onChange(new Set());
    } else {
      onChange(new Set(clients.map((c) => c.id)));
    }
  };

  const allChecked = selected.size === clients.length && clients.length > 0;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Sélectionne tes destinataires ({selected.size}/{clients.length})
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] font-medium text-[var(--accent)] hover:underline"
        >
          {allChecked ? "Tout décocher" : "Tout cocher"}
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-popover-solid,var(--bg-elevated))]">
        <ul className="divide-y divide-[var(--border-subtle)]">
          {clients.map((c) => {
            const isChecked = selected.has(c.id);
            const fullName =
              [c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom";
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 p-2 hover:bg-[var(--bg-glass)]">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(c.id)}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                    {fullName}
                  </span>
                  {c.telephone && (
                    <span className="shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">
                      +{c.telephone}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SmsPreview({ message, sender }: { message: string; sender: string }) {
  // Remplacement des tags pour la preview (avec valeurs fictives)
  const previewText = message
    .replace(/\{prenom\}/gi, "Marc")
    .replace(/\{nom\}/gi, "Dupont")
    .replace(/\{resto\}/gi, "Le Tire-Bouchon");

  const placeholder = "Ton message s'affichera ici…";
  const text = previewText.trim() || placeholder;
  const isPlaceholder = !previewText.trim();

  return (
    <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 lg:sticky lg:top-24">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        <MessageSquare className="size-3" strokeWidth={1.75} />
        Aperçu (valeurs d&apos;exemple : Marc / Dupont / Le Tire-Bouchon)
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-elevated)]">
        <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-3 py-2 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
          <span>9:41</span>
          <span className="text-[var(--text-tertiary)]">●●● 5G ▮</span>
        </div>
        <div className="flex items-center gap-2 border-b border-[var(--border-glass)] px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-[var(--neon-cyan)] text-[var(--bg-primary)]">
            <span className="text-xs font-bold">
              {(sender || "R").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
              {sender || "Restaurant"}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              SMS · maintenant
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 px-3 py-4">
          <div className="max-w-[85%] self-start whitespace-pre-line rounded-2xl rounded-bl-md bg-[var(--bg-glass-strong)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-primary)] shadow-sm">
            <span className={isPlaceholder ? "italic opacity-50" : ""}>
              {text}
            </span>
          </div>
          <span className="mt-1 self-start text-[10px] text-[var(--text-tertiary)]">
            Distribué
          </span>
        </div>
      </div>
    </div>
  );
}
