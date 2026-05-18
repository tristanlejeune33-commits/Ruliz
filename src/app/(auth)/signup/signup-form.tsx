"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { clearSessionCookies, signupClient } from "@/server/auth/actions";
import {
  SIGNUP_COUNTRIES,
  languageFromCountry,
} from "@/lib/country-language";

const schema = z.object({
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  country: z.string().length(2),
  prospectToken: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface SignupFormProps {
  /** Pré-remplissage si l'user arrive depuis /preview/[token] */
  prefill?: {
    email: string;
    prospectToken: string;
  };
}

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

const focusFx = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#26438A";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(38,67,138,0.18)";
};
const blurFx = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#D8E1F3";
  e.currentTarget.style.boxShadow = "none";
};

export function SignupForm({ prefill }: SignupFormProps = {}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      prenom: "",
      nom: "",
      email: prefill?.email ?? "",
      password: "",
      country: "FR",
      prospectToken: prefill?.prospectToken,
    },
  });

  const country = form.watch("country");
  const detectedLang = languageFromCountry(country);

  async function onSubmit(values: Values) {
    setIsPending(true);
    const res = await signupClient(values);
    setIsPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    // Garde-fou anti-leak : nettoie les cookies session d'une précédente
    // session (active restaurant, impersonation) avant de naviguer.
    await clearSessionCookies().catch(() => null);

    // Message contextuel selon activation prospect ou pas
    if (res.data?.activatedProspect) {
      toast.success("Compte créé et carte activée !");
    } else {
      toast.success("Compte créé. Bienvenue !");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="prenom"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="signup-prenom" style={LABEL_STYLE}>
                  Prénom
                </label>
                <FormControl>
                  <input
                    id="signup-prenom"
                    autoComplete="given-name"
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
          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="signup-nom" style={LABEL_STYLE}>
                  Nom
                </label>
                <FormControl>
                  <input
                    id="signup-nom"
                    autoComplete="family-name"
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
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <label htmlFor="signup-email" style={LABEL_STYLE}>
                Email professionnel
              </label>
              <FormControl>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="marie@tirebouchon.fr"
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <label htmlFor="signup-password" style={LABEL_STYLE}>
                Mot de passe
              </label>
              <FormControl>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
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

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <label htmlFor="signup-country" style={LABEL_STYLE}>
                Pays de ton restaurant
              </label>
              <FormControl>
                <select
                  id="signup-country"
                  style={INPUT_STYLE}
                  value={field.value}
                  onChange={field.onChange}
                  onFocus={focusFx}
                  onBlur={(e) => {
                    blurFx(e);
                    field.onBlur();
                  }}
                >
                  {SIGNUP_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <p
                className="mt-1.5 text-xs leading-snug"
                style={{ color: "#6b7791" }}
              >
                Détecte automatiquement la langue de ta carte (
                <strong style={{ color: "#26438A" }}>
                  {detectedLang.toUpperCase()}
                </strong>
                ). Modifiable plus tard dans les paramètres.
              </p>
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
              <span>Création…</span>
            </>
          ) : (
            <>
              <span>Créer mon compte</span>
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          )}
        </Button>

        <p className="text-center text-xs" style={{ color: "#4A5573" }}>
          En créant un compte, tu acceptes nos{" "}
          <a
            href="/legal/mentions-legales"
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
            style={{ color: "#26438A" }}
          >
            CGV
          </a>{" "}
          et notre{" "}
          <a
            href="/legal/politique-confidentialite"
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
            style={{ color: "#26438A" }}
          >
            politique de confidentialité
          </a>
          .
        </p>
      </form>
    </Form>
  );
}
