"use client";

import { useState } from "react";
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

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: Values) {
    setTopError(null);
    setIsPending(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });
      if (res.error) {
        setTopError(
          res.error.message ??
            "Lien expiré ou invalide. Refais une demande.",
        );
        setIsPending(false);
        return;
      }
      setSuccess(true);
      toast.success("Mot de passe mis à jour. Redirection…");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTopError(`Erreur serveur : ${msg}`);
      setIsPending(false);
    }
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
        {success && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm"
            style={{
              background: "var(--neon-success-soft)",
              borderColor:
                "color-mix(in srgb, var(--neon-success) 24%, transparent)",
              color: "var(--neon-success)",
            }}
          >
            <CheckCircle2 className="mt-px size-4 shrink-0" strokeWidth={2} />
            <span className="leading-snug">
              Mot de passe mis à jour. Tu peux te reconnecter.
            </span>
          </div>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nouveau mot de passe</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
                    className="pr-11"
                    autoFocus
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={
                      showPwd ? "Masquer" : "Afficher"
                    }
                    tabIndex={-1}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-secondary)]"
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

        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirme ton mot de passe</FormLabel>
              <FormControl>
                <Input
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Retape le mot de passe"
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
          disabled={isPending || success}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Mise à jour…</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="size-4" strokeWidth={2.5} />
              <span>Réussi</span>
            </>
          ) : (
            <>
              <span>Changer mon mot de passe</span>
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
