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
  FormMessage,
} from "@/components/ui/form";
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
          res.error.message ?? "Lien expiré ou invalide. Refais une demande.",
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
              Mot de passe mis à jour. Tu peux te reconnecter.
            </span>
          </div>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <label htmlFor="reset-password" style={LABEL_STYLE}>
                Nouveau mot de passe
              </label>
              <FormControl>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
                    autoFocus
                    style={{ ...INPUT_STYLE, paddingRight: 44 }}
                    {...field}
                    onFocus={focusFx}
                    onBlur={(e) => {
                      blurFx(e);
                      field.onBlur();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                    tabIndex={-1}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition"
                    style={{ color: "#8892AB" }}
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
              <label htmlFor="reset-confirm" style={LABEL_STYLE}>
                Confirme ton mot de passe
              </label>
              <FormControl>
                <input
                  id="reset-confirm"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Retape le mot de passe"
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
          disabled={isPending || success}
          style={{ background: "#26438A", color: "#FFFFFF", border: 0 }}
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
