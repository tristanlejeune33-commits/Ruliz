"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.email("Email invalide"),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    setTopError(null);
    setIsPending(true);
    try {
      // Better-Auth — envoie l'email avec un lien `redirectTo` vers la page
      // /reset-password avec un token. La page /reset-password lit le token
      // depuis l'URL et appelle authClient.resetPassword().
      const res = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: "/reset-password",
      });
      if (res.error) {
        setTopError(res.error.message ?? "Erreur lors de l'envoi.");
        setIsPending(false);
        return;
      }
      setSentEmail(values.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTopError(`Erreur serveur : ${msg}`);
    }
    setIsPending(false);
  }

  // Écran de confirmation après envoi
  if (sentEmail) {
    return (
      <div
        className="flex flex-col items-start gap-3 rounded-xl border px-4 py-4 text-sm"
        role="status"
        style={{
          background: "var(--neon-success-soft)",
          borderColor:
            "color-mix(in srgb, var(--neon-success) 24%, transparent)",
          color: "var(--neon-success)",
        }}
      >
        <div className="flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="size-5" strokeWidth={2} />
          Email envoyé !
        </div>
        <p className="leading-snug">
          Si un compte existe pour <strong>{sentEmail}</strong>, tu vas
          recevoir un email avec un lien pour réinitialiser ton mot de
          passe. Il est valable <strong>1 heure</strong>.
        </p>
        <p className="text-xs opacity-80">
          Pense à vérifier ton dossier <strong>Spam</strong> si tu ne le
          vois pas tout de suite.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {topError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm"
            style={{
              background: "var(--neon-danger-soft)",
              borderColor:
                "color-mix(in srgb, var(--neon-danger) 24%, transparent)",
              color: "var(--neon-danger)",
            }}
          >
            <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={2} />
            <span className="leading-snug">{topError}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email du compte</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="marie@tirebouchon.fr"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Envoi en cours…</span>
            </>
          ) : (
            <>
              <span>Envoyer le lien</span>
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
