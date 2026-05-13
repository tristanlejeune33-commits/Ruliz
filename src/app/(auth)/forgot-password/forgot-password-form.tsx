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
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.email("Email invalide"),
});

type Values = z.infer<typeof schema>;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  fontSize: 14,
  fontWeight: 500,
  color: "#0B1530",
  background: "#FFFFFF",
  border: "1px solid #D8E1F3",
  borderRadius: 12,
  outline: "none",
};
const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#0B1530",
  marginBottom: 6,
};

const focusFx = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#26438A";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38,67,138,0.18)";
};
const blurFx = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#D8E1F3";
  e.currentTarget.style.boxShadow = "none";
};

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
          background: "#E6F4EE",
          borderColor: "rgba(26, 127, 90, 0.24)",
          color: "#1A7F5A",
        }}
      >
        <div className="flex items-center gap-2.5 font-bold">
          <CheckCircle2 className="size-5" strokeWidth={2} />
          Email envoyé !
        </div>
        <p className="leading-snug" style={{ color: "#0B1530" }}>
          Si un compte existe pour{" "}
          <strong style={{ color: "#0B1530" }}>{sentEmail}</strong>, tu vas
          recevoir un email avec un lien pour réinitialiser ton mot de passe.
          Il est valable <strong>1 heure</strong>.
        </p>
        <p className="text-xs" style={{ color: "#4A5573" }}>
          Pense à vérifier ton dossier <strong>Spam</strong> si tu ne le vois
          pas tout de suite.
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
              background: "#FCE8EC",
              borderColor: "rgba(185, 28, 59, 0.24)",
              color: "#B91C3B",
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
              <label htmlFor="forgot-email" style={LABEL_STYLE}>
                Email du compte
              </label>
              <FormControl>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="marie@tirebouchon.fr"
                  autoFocus
                  style={INPUT_STYLE}
                  {...field}
                  onFocus={focusFx}
                  onBlur={(e) => {
                    blurFx(e);
                    field.onBlur();
                  }}
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
          style={{ background: "#26438A", color: "#FFFFFF", border: 0 }}
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
