"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MessageSquare, Send } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendSmsBlast } from "@/server/dashboard/sms-actions";

const schema = z.object({
  message: z.string().min(1, "Requis").max(320),
  filterSource: z.enum(["all", "roulette", "manual"]),
});
type Values = z.infer<typeof schema>;

interface SmsBlastFormProps {
  restaurantId: string;
  configured: boolean;
}

export function SmsBlastForm({ restaurantId, configured }: SmsBlastFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { message: "", filterSource: "all" },
  });

  const message = form.watch("message");
  const segments = Math.ceil(message.length / 160) || 1;

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await sendSmsBlast({ restaurantId, ...values });
      if (res.ok && res.data) {
        toast.success(
          `Envoyés : ${res.data.sent} · échecs : ${res.data.failed} · ignorés : ${res.data.skipped}`,
        );
        form.reset({ message: "", filterSource: values.filterSource });
      } else if (!res.ok) toast.error(res.error);
    });
  };

  // Compteur de caractères avec coloration palière :
  // - 0–140  : neutre
  // - 141–160 : warning (jaune) → on approche du 1er segment
  // - 161+    : danger (rouge) → multi-segments, coût ×N
  const charCount = message.length;
  const charTone =
    charCount === 0
      ? "neutral"
      : charCount > 160
        ? "danger"
        : charCount > 140
          ? "warning"
          : "neutral";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Layout responsive : édition empilée mobile, split édition / preview desktop */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* === ÉDITION === */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Message</FormLabel>
                    <CharCounter
                      count={charCount}
                      max={320}
                      segments={segments}
                      tone={charTone}
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      rows={4}
                      maxLength={320}
                      inputMode="text"
                      placeholder="Salut {{prenom}}, ce soir on lance la nouvelle carte d'hiver — réserve vite !"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="filterSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cible</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Tous les contacts</SelectItem>
                      <SelectItem value="roulette">
                        Issus de la roulette
                      </SelectItem>
                      <SelectItem value="manual">Ajouts manuels</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* === PREVIEW IPHONE-LIKE === */}
          <SmsPreview message={message || ""} />
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={pending || !configured}
            className="w-full sm:w-auto"
            size="lg"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Envoyer le SMS
          </Button>
        </div>
        {!configured && (
          <p className="text-xs text-[var(--text-muted)]">
            Configure Brevo (BREVO_API_KEY) pour activer l&apos;envoi.
          </p>
        )}
      </form>
    </Form>
  );
}

/** Compteur de caractères avec coloration palière + nb de segments SMS. */
function CharCounter({
  count,
  max,
  segments,
  tone,
}: {
  count: number;
  max: number;
  segments: number;
  tone: "neutral" | "warning" | "danger";
}) {
  const TONE_CLASSES = {
    neutral: "text-[var(--text-tertiary)]",
    warning: "text-[var(--neon-violet)]",
    danger: "text-[var(--neon-danger)]",
  };
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] tabular-nums",
        TONE_CLASSES[tone],
      )}
    >
      <span>
        {count}/{max}
      </span>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <span>
        {segments} SMS{segments > 1 ? "s" : ""}
      </span>
    </span>
  );
}

/**
 * Preview iPhone-like du message — bulle iMessage style à gauche du screen.
 * Sur mobile, prend toute la largeur sous le formulaire.
 */
function SmsPreview({ message }: { message: string }) {
  const placeholder = "Ton message s'affichera ici…";
  const text = message.trim() || placeholder;
  const isPlaceholder = !message.trim();

  return (
    <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 lg:sticky lg:top-24">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        <MessageSquare className="size-3" strokeWidth={1.75} />
        Aperçu SMS
      </div>

      {/* Frame iPhone simplifiée : header + bulle */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-elevated)]">
        {/* Status bar mock */}
        <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-3 py-2 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
          <span>9:41</span>
          <span className="text-[var(--text-tertiary)]">●●● 5G ▮</span>
        </div>
        {/* Header conversation */}
        <div className="flex items-center gap-2 border-b border-[var(--border-glass)] px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-[var(--neon-cyan)] text-[var(--bg-primary)]">
            <span className="text-xs font-bold">R</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Restaurant
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              SMS · maintenant
            </div>
          </div>
        </div>
        {/* Bulle SMS */}
        <div className="flex flex-col gap-1 px-3 py-4">
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-[var(--bg-glass-strong)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-primary)] shadow-sm">
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
