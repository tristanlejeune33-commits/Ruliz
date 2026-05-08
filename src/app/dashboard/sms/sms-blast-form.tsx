"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={320}
                  placeholder="Salut {{prenom}}, ce soir on lance la nouvelle carte d'hiver — réserve vite !"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {message.length} / 320 caractères · {segments} segment
                {segments > 1 ? "s" : ""} SMS
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="filterSource"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel>Cible</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Tous les contacts</SelectItem>
                  <SelectItem value="roulette">Issus de la roulette</SelectItem>
                  <SelectItem value="manual">Ajouts manuels</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={pending || !configured}>
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
