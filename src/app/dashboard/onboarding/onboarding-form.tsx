"use client";

import { useTransition } from "react";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import { createFirstRestaurant } from "@/server/dashboard/actions";

type Langue = "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";

const schema = z.object({
  nom: z.string().min(1, "Requis").max(255),
  adresse: z.string().max(500),
  codePostal: z.string().max(10),
  ville: z.string().max(100),
  email: z.string().max(255),
  telephone: z.string().max(20),
  langueNative: z.enum(["fr", "en", "es", "de", "it", "pt", "zh"]),
});
type Values = z.infer<typeof schema>;

interface OnboardingFormProps {
  /** Langue pré-sélectionnée (déduite du pays au signup). */
  defaultLangue?: Langue;
}

export function OnboardingForm({ defaultLangue = "fr" }: OnboardingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "",
      adresse: "",
      codePostal: "",
      ville: "",
      email: "",
      telephone: "",
      langueNative: defaultLangue,
    },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await createFirstRestaurant(values);
      if (res.ok) {
        toast.success("Restaurant créé !");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du restaurant *</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="Le Tire-Bouchon"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adresse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="12 rue de la Paix" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <FormField
            control={form.control}
            name="codePostal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code postal</FormLabel>
                <FormControl>
                  <Input placeholder="33000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ville"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ville</FormLabel>
                <FormControl>
                  <Input placeholder="Bordeaux" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="langueNative"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Langue de la carte</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUPPORTED_LANGS.map((l) => (
                    <SelectItem key={l} value={l}>
                      <span className="flex items-center gap-2">
                        <FlagIcon lang={l} width={18} rounded />
                        {LANG_META[l].name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email contact</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input placeholder="05 56 …" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Créer mon restaurant
        </Button>
      </form>
    </Form>
  );
}
