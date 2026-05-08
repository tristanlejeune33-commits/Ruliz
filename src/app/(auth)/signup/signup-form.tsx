"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { signupClient } from "@/server/auth/actions";

const schema = z.object({
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

type Values = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { prenom: "", nom: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setIsPending(true);
    const res = await signupClient(values);
    setIsPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success("Compte créé. Bienvenue !");
    // Better-Auth autoSignIn ouvre la session ; on force un refresh
    // pour que les Server Components re-fetchent.
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
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
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
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
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
              <FormLabel>Email</FormLabel>
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
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Créer mon compte
        </Button>
        <p className="text-center text-xs text-[var(--text-muted)]">
          En créant un compte, tu acceptes nos{" "}
          <a href="/legal/cgv" className="underline hover:text-[var(--text-primary)]">
            CGV
          </a>{" "}
          et notre{" "}
          <a
            href="/legal/privacy"
            className="underline hover:text-[var(--text-primary)]"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </form>
    </Form>
  );
}
