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
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";
import { clearSessionCookies, getPostLoginUrl } from "@/server/auth/actions";
import { AuthDivider, GoogleButton } from "../google-button";

const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Styles d'input et label en HEX explicites on évite les var() pour ne PAS
 * dépendre de la cascade `data-theme="light"` qui peut foirer si une CSS
 * variable n'est pas overridée correctement par un parent. Tout est lisible
 * peu importe le contexte parent.
 */
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

export function LoginForm({
  redirectTo,
  googleEnabled = false,
}: {
  redirectTo?: string;
  googleEnabled?: boolean;
}) {
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
    let error: { message?: string; code?: string; status?: number } | null =
      null;
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

    await clearSessionCookies().catch(() => null);

    let target = "/dashboard";
    try {
      const res = await getPostLoginUrl(redirectTo);
      target = res.url;
    } catch (err) {
      console.warn("[login] getPostLoginUrl failed, fallback /dashboard:", err);
    }

    setSuccess(true);
    toast.success("Connecté.");
    router.push(target);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {googleEnabled && (
          <>
            <GoogleButton redirectTo={redirectTo} />
            <AuthDivider />
          </>
        )}
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
        {success && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm"
            style={{
              background: "#E6F4EE",
              borderColor: "rgba(26, 127, 90, 0.24)",
              color: "#1A7F5A",
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
              <label htmlFor="login-email" style={LABEL_STYLE}>
                Email professionnel
              </label>
              <FormControl>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="marie@tirebouchon.fr"
                  style={INPUT_STYLE}
                  {...field}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#26438A";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(38,67,138,0.18)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#D8E1F3";
                    e.currentTarget.style.boxShadow = "none";
                    field.onBlur();
                  }}
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
              <div className="flex items-baseline justify-between">
                <label htmlFor="login-password" style={LABEL_STYLE}>
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: "#26438A", textUnderlineOffset: "3px" }}
                >
                  Oublié ?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ ...INPUT_STYLE, paddingRight: 44 }}
                    {...field}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#26438A";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(38,67,138,0.18)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#D8E1F3";
                      e.currentTarget.style.boxShadow = "none";
                      field.onBlur();
                    }}
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
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition"
                    style={{ color: "#5e6b85" }}
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
          style={{
            background: "#26438A",
            color: "#FFFFFF",
            border: 0,
          }}
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
