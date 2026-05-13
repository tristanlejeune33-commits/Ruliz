"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
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
import { authClient } from "@/lib/auth-client";
import { clearSessionCookies } from "@/server/auth/actions";

const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setTopError(null);
    setIsPending(true);
    let error: { message?: string; code?: string; status?: number } | null = null;
    try {
      const res = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      error = res.error;
    } catch (err) {
      console.error("[login] signIn.email threw:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setTopError(`Erreur serveur : ${msg}`);
      setIsPending(false);
      return;
    }

    if (error) {
      console.error("[login] auth error:", error);
      const detail = error.message ?? error.code ?? "inconnue";
      setTopError(`Connexion impossible : ${detail}`);
      setIsPending(false);
      return;
    }

    // Garde-fou anti-leak : si un cookie ruliz_active_restaurant ou
    // ruliz_impersonate_user_id traîne d'une session précédente sur le
    // même navigateur, on le supprime avant la nav vers /dashboard.
    await clearSessionCookies().catch(() => null);

    setSuccess(true);
    toast.success("Connecté.");
    router.push(redirectTo ?? "/dashboard");
    router.refresh();
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
              background: "var(--danger-bg)",
              borderColor: "color-mix(in srgb, var(--danger-fg) 24%, transparent)",
              color: "var(--danger-fg)",
            }}
          >
            <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={2} />
            <span className="leading-snug">{topError}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm"
            style={{
              background: "var(--success-bg)",
              borderColor: "color-mix(in srgb, var(--success-fg) 24%, transparent)",
              color: "var(--success-fg)",
            }}
          >
            <CheckCircle2 className="mt-px size-4 shrink-0" strokeWidth={2} />
            <span className="leading-snug">
              Connecté. Redirection vers le tableau de bord…
            </span>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email professionnel</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="marie@tirebouchon.fr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Mot de passe</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[var(--brand-blue,#26438A)] hover:underline"
                  style={{ textUnderlineOffset: "3px" }}
                >
                  Oublié ?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-11"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={
                      showPwd
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    tabIndex={-1}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--bg-surface-hover,#f1f4fa)] hover:text-[var(--text-secondary)]"
                  >
                    {showPwd ? (
                      <EyeOff className="size-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending || success}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Connexion…</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="size-4" strokeWidth={2.5} />
              <span>Connecté</span>
            </>
          ) : (
            <>
              <span>Se connecter</span>
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
